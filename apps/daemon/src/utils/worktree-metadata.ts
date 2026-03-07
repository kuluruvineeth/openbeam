import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";

const OpenBeamWorktreeMetadataV1Schema = z.object({
  version: z.literal(1),
  baseRefName: z.string().min(1),
});

const OpenBeamWorktreeMetadataV2Schema = z.object({
  version: z.literal(2),
  baseRefName: z.string().min(1),
  runtime: z
    .object({
      worktreePort: z.number().int().positive(),
    })
    .optional(),
});

const OpenBeamWorktreeMetadataSchema = z.union([
  OpenBeamWorktreeMetadataV1Schema,
  OpenBeamWorktreeMetadataV2Schema,
]);

export type OpenBeamWorktreeMetadata = z.infer<
  typeof OpenBeamWorktreeMetadataSchema
>;

function getGitDirForWorktreeRoot(worktreeRoot: string): string {
  const gitPath = join(worktreeRoot, ".git");
  if (!existsSync(gitPath)) {
    throw new Error(`Not a git repository: ${worktreeRoot}`);
  }

  // In a worktree checkout, `.git` is a file containing `gitdir: <path>`.
  // In a normal checkout, `.git` is a directory.
  try {
    const gitFileContent = readFileSync(gitPath, "utf8");
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    const match = gitFileContent.match(/gitdir:\s*(.+)/);
    if (match?.[1]) {
      const raw = match[1].trim();
      return isAbsolute(raw) ? raw : resolve(worktreeRoot, raw);
    }
  } catch {
    // If `.git` is a directory, readFileSync will throw; fall through.
  }

  return gitPath;
}

export function getOpenBeamWorktreeMetadataPath(worktreeRoot: string): string {
  const gitDir = getGitDirForWorktreeRoot(worktreeRoot);
  return join(gitDir, "openbeam", "worktree.json");
}

export function normalizeBaseRefName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Base branch is required");
  }
  if (trimmed.startsWith("origin/")) {
    return trimmed.slice("origin/".length);
  }
  return trimmed;
}

export function writeOpenBeamWorktreeMetadata(
  worktreeRoot: string,
  options: { baseRefName: string }
): void {
  const baseRefName = normalizeBaseRefName(options.baseRefName);
  if (baseRefName === "HEAD") {
    throw new Error("Base branch cannot be HEAD");
  }
  if (baseRefName.includes("..") || baseRefName.includes("@{")) {
    throw new Error(`Invalid base branch: ${baseRefName}`);
  }
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  if (!/^[0-9A-Za-z._/-]+$/.test(baseRefName)) {
    throw new Error(`Invalid base branch: ${baseRefName}`);
  }

  const metadataPath = getOpenBeamWorktreeMetadataPath(worktreeRoot);
  mkdirSync(join(getGitDirForWorktreeRoot(worktreeRoot), "openbeam"), {
    recursive: true,
  });
  const metadata: OpenBeamWorktreeMetadata = { version: 1, baseRefName };
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

export function writeOpenBeamWorktreeRuntimeMetadata(
  worktreeRoot: string,
  options: { worktreePort: number }
): void {
  if (!Number.isInteger(options.worktreePort) || options.worktreePort <= 0) {
    throw new Error(`Invalid worktree runtime port: ${options.worktreePort}`);
  }

  const current = readOpenBeamWorktreeMetadata(worktreeRoot);
  if (!current) {
    throw new Error(
      "Cannot persist worktree runtime metadata: missing base metadata"
    );
  }

  const metadataPath = getOpenBeamWorktreeMetadataPath(worktreeRoot);
  mkdirSync(join(getGitDirForWorktreeRoot(worktreeRoot), "openbeam"), {
    recursive: true,
  });
  const next: OpenBeamWorktreeMetadata = {
    version: 2,
    baseRefName: current.baseRefName,
    runtime: {
      worktreePort: options.worktreePort,
    },
  };
  writeFileSync(metadataPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function readOpenBeamWorktreeMetadata(
  worktreeRoot: string
): OpenBeamWorktreeMetadata | null {
  const metadataPath = getOpenBeamWorktreeMetadataPath(worktreeRoot);
  if (!existsSync(metadataPath)) {
    return null;
  }
  const parsed = JSON.parse(readFileSync(metadataPath, "utf8"));
  return OpenBeamWorktreeMetadataSchema.parse(parsed);
}

export function requireOpenBeamWorktreeBaseRefName(
  worktreeRoot: string
): string {
  const metadataPath = getOpenBeamWorktreeMetadataPath(worktreeRoot);
  const metadata = readOpenBeamWorktreeMetadata(worktreeRoot);
  if (!metadata) {
    throw new Error(`Missing OpenBeam worktree base metadata: ${metadataPath}`);
  }
  return metadata.baseRefName;
}

export function readOpenBeamWorktreeRuntimePort(
  worktreeRoot: string
): number | null {
  const metadata = readOpenBeamWorktreeMetadata(worktreeRoot);
  if (!metadata) {
    return null;
  }
  if (metadata.version === 2 && metadata.runtime?.worktreePort) {
    return metadata.runtime.worktreePort;
  }
  return null;
}
