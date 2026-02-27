import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";

export const ICON_PATTERNS = [
  "favicon.ico",
  "favicon.png",
  "favicon.svg",
  "favico.ico",
  "favico.png",
  "favico.svg",
  "icon.png",
  "icon.svg",
  "app-icon.png",
  "app-icon.svg",
  "apple-touch-icon.png",
  "icon-*.png",
  "logo.png",
  "logo.svg",
];

export const PRIORITY_DIRS = ["public", "static", "assets", "images", "img"];

export const MONOREPO_PACKAGE_DIRS = ["packages", "apps"];

export const IGNORED_DIRS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  ".cache",
  "vendor",
  "src",
  "lib",
  "test",
  "tests",
  "__tests__",
];

export interface ProjectIcon {
  data: string;
  mimeType: string;
}

const MAX_ICON_SIZE = 32 * 1024;

interface ImageDimensions {
  width: number;
  height: number;
}

function getPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) {
    return null;
  }
  if (
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function getJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4) {
    return null;
  }
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      // biome-ignore lint/nursery/noIncrementDecrement: increment in loop
      offset++;
      continue;
    }

    // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
    const marker = buffer[offset + 1]!;
    if (marker >= 0xc0 && marker <= 0xc2) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    const length = buffer.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  return null;
}

function getGifDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 10) {
    return null;
  }
  if (buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46) {
    return null;
  }
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return { width, height };
}

function getWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) {
    return null;
  }
  if (buffer.toString("ascii", 0, 4) !== "RIFF") {
    return null;
  }
  if (buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8 ") {
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
    const width = buffer.readUInt16LE(26) & 0x3f_ff;
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
    const height = buffer.readUInt16LE(28) & 0x3f_ff;
    return { width, height };
  }
  if (chunkType === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
    const width = (bits & 0x3f_ff) + 1;
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
    const height = ((bits >> 14) & 0x3f_ff) + 1;
    return { width, height };
  }
  return null;
}

function getImageDimensions(
  buffer: Buffer,
  mimeType: string
): ImageDimensions | null {
  switch (mimeType) {
    case "image/png":
      return getPngDimensions(buffer);
    case "image/jpeg":
      return getJpegDimensions(buffer);
    case "image/gif":
      return getGifDimensions(buffer);
    case "image/webp":
      return getWebpDimensions(buffer);
    case "image/x-icon":
      return { width: 1, height: 1 };
    case "image/svg+xml":
      return { width: 1, height: 1 };
    default:
      return null;
  }
}

function isSquareImage(buffer: Buffer, mimeType: string): boolean {
  const dimensions = getImageDimensions(buffer, mimeType);
  if (!dimensions) {
    return false;
  }
  return dimensions.width === dimensions.height;
}

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  switch (ext) {
    case ".ico":
      return "image/x-icon";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function matchesPattern(filename: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
    return new RegExp(`^${regexPattern}$`).test(filename);
  }
  return filename === pattern;
}

async function findIconInDir(
  dir: string,
  patterns: string[]
): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }

  for (const pattern of patterns) {
    for (const entry of entries) {
      if (matchesPattern(entry, pattern)) {
        const fullPath = join(dir, entry);
        try {
          const stats = await stat(fullPath);
          if (stats.isFile()) {
            return fullPath;
          }
          // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
        } catch {}
      }
    }
  }

  return null;
}

// biome-ignore lint/nursery/useMaxParams: callback signature
async function searchDirRecursively(
  dir: string,
  patterns: string[],
  ignoredDirs: Set<string>,
  maxDepth: number,
  currentDepth = 0
): Promise<string | null> {
  if (currentDepth > maxDepth) {
    return null;
  }

  const found = await findIconInDir(dir, patterns);
  if (found) {
    return found;
  }

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (ignoredDirs.has(entry)) {
      continue;
    }

    const fullPath = join(dir, entry);
    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        const result = await searchDirRecursively(
          fullPath,
          patterns,
          ignoredDirs,
          maxDepth,
          currentDepth + 1
        );
        if (result) {
          return result;
        }
      }
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    } catch {}
  }

  return null;
}

export async function findProjectIcon(
  projectDir: string,
  maxDepth = 3
): Promise<string | null> {
  const ignoredDirsSet = new Set(IGNORED_DIRS);

  for (const priorityDir of PRIORITY_DIRS) {
    const priorityPath = join(projectDir, priorityDir);
    try {
      const stats = await stat(priorityPath);
      if (stats.isDirectory()) {
        const result = await searchDirRecursively(
          priorityPath,
          ICON_PATTERNS,
          ignoredDirsSet,
          maxDepth - 1
        );
        if (result) {
          return result;
        }
      }
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    } catch {}
  }

  for (const monoDir of MONOREPO_PACKAGE_DIRS) {
    const monoPath = join(projectDir, monoDir);
    let packageEntries: string[];
    try {
      packageEntries = await readdir(monoPath);
    } catch {
      continue;
    }

    for (const packageName of packageEntries) {
      const packagePath = join(monoPath, packageName);
      try {
        const packageStats = await stat(packagePath);
        if (!packageStats.isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }

      for (const priorityDir of PRIORITY_DIRS) {
        const priorityPath = join(packagePath, priorityDir);
        try {
          const priorityStats = await stat(priorityPath);
          if (priorityStats.isDirectory()) {
            const result = await searchDirRecursively(
              priorityPath,
              ICON_PATTERNS,
              ignoredDirsSet,
              maxDepth - 1
            );
            if (result) {
              return result;
            }
          }
          // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
        } catch {}
      }

      const found = await findIconInDir(packagePath, ICON_PATTERNS);
      if (found) {
        return found;
      }
    }
  }

  const found = await findDirRecursively(projectDir);
  if (found) {
    return found;
  }

  return null;
}

async function findDirRecursively(
  dir: string,
  maxDepth = 2,
  currentDepth = 0
): Promise<string | null> {
  const ignoredDirsSet = new Set(IGNORED_DIRS);
  const priorityDirsSet = new Set(PRIORITY_DIRS);

  if (currentDepth > maxDepth) {
    return null;
  }

  const found = await findIconInDir(dir, ICON_PATTERNS);
  if (found) {
    return found;
  }

  if (currentDepth > 0) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return null;
    }

    for (const entry of entries) {
      if (ignoredDirsSet.has(entry) || priorityDirsSet.has(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          const result = await findDirRecursively(
            fullPath,
            maxDepth,
            currentDepth + 1
          );
          if (result) {
            return result;
          }
        }
        // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      } catch {}
    }
  }

  return null;
}

export async function getProjectIcon(
  projectDir: string
): Promise<ProjectIcon | null> {
  const iconPath = await findProjectIcon(projectDir);
  if (!iconPath) {
    return null;
  }

  try {
    const stats = await stat(iconPath);
    if (stats.size > MAX_ICON_SIZE) {
      return null;
    }

    const buffer = await readFile(iconPath);
    const mimeType = getMimeType(iconPath);

    if (!isSquareImage(buffer, mimeType)) {
      return null;
    }

    const data = buffer.toString("base64");
    return { data, mimeType };
  } catch {
    return null;
  }
}
