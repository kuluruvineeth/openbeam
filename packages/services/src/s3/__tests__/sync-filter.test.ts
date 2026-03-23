import { describe, expect, it } from "bun:test";
import type { S3Object } from "../client";

const BYTES_PER_MB = 1_048_576;
const MS_PER_DAY = 86_400_000;

interface FilterOptions {
  excludePrefixes?: string[];
  fileTypesFilter?: string[];
  maxFileSizeMb?: number;
  lookbackDays?: number;
}

function shouldIncludeObject(obj: S3Object, options: FilterOptions): boolean {
  if (options.excludePrefixes && options.excludePrefixes.length > 0) {
    for (const prefix of options.excludePrefixes) {
      if (obj.key.startsWith(prefix)) {
        return false;
      }
    }
  }

  if (options.fileTypesFilter && options.fileTypesFilter.length > 0) {
    const ext =
      obj.key.lastIndexOf(".") !== -1
        ? obj.key.slice(obj.key.lastIndexOf(".") + 1).toLowerCase()
        : "";
    if (!(ext && options.fileTypesFilter.includes(ext))) {
      return false;
    }
  }

  if (
    options.maxFileSizeMb &&
    options.maxFileSizeMb > 0 &&
    obj.size > options.maxFileSizeMb * BYTES_PER_MB
  ) {
    return false;
  }

  if (options.lookbackDays && options.lookbackDays > 0) {
    const cutoff = Date.now() - options.lookbackDays * MS_PER_DAY;
    if (new Date(obj.lastModified).getTime() < cutoff) {
      return false;
    }
  }

  if (obj.key.endsWith("/") && obj.size === 0) {
    return false;
  }

  return true;
}

function makeObject(overrides: Partial<S3Object> = {}): S3Object {
  return {
    key: "test/file.txt",
    lastModified: new Date().toISOString(),
    etag: "abc",
    size: 1024,
    storageClass: "STANDARD",
    ...overrides,
  };
}

describe("S3 sync filter", () => {
  it("includes normal objects by default", () => {
    expect(shouldIncludeObject(makeObject(), {})).toBe(true);
  });

  it("excludes folder markers", () => {
    const folder = makeObject({ key: "data/subfolder/", size: 0 });
    expect(shouldIncludeObject(folder, {})).toBe(false);
  });

  it("excludes objects matching exclude prefixes", () => {
    const obj = makeObject({ key: "tmp/cache/file.dat" });
    expect(
      shouldIncludeObject(obj, { excludePrefixes: ["tmp/", "logs/"] })
    ).toBe(false);
  });

  it("includes objects not matching exclude prefixes", () => {
    const obj = makeObject({ key: "docs/report.pdf" });
    expect(
      shouldIncludeObject(obj, { excludePrefixes: ["tmp/", "logs/"] })
    ).toBe(true);
  });

  it("filters by file type", () => {
    const pdf = makeObject({ key: "report.pdf" });
    const csv = makeObject({ key: "data.csv" });
    const png = makeObject({ key: "image.png" });

    const opts = { fileTypesFilter: ["pdf", "csv"] };
    expect(shouldIncludeObject(pdf, opts)).toBe(true);
    expect(shouldIncludeObject(csv, opts)).toBe(true);
    expect(shouldIncludeObject(png, opts)).toBe(false);
  });

  it("excludes objects without extension when file types filter is set", () => {
    const noExt = makeObject({ key: "Makefile" });
    expect(
      shouldIncludeObject(noExt, { fileTypesFilter: ["txt", "pdf"] })
    ).toBe(false);
  });

  it("excludes objects exceeding max file size", () => {
    const large = makeObject({ size: 200 * BYTES_PER_MB });
    expect(shouldIncludeObject(large, { maxFileSizeMb: 100 })).toBe(false);
  });

  it("includes objects within max file size", () => {
    const small = makeObject({ size: 50 * BYTES_PER_MB });
    expect(shouldIncludeObject(small, { maxFileSizeMb: 100 })).toBe(true);
  });

  it("excludes objects older than lookback days", () => {
    const old = makeObject({
      lastModified: new Date(Date.now() - 60 * MS_PER_DAY).toISOString(),
    });
    expect(shouldIncludeObject(old, { lookbackDays: 30 })).toBe(false);
  });

  it("includes objects within lookback days", () => {
    const recent = makeObject({
      lastModified: new Date(Date.now() - 5 * MS_PER_DAY).toISOString(),
    });
    expect(shouldIncludeObject(recent, { lookbackDays: 30 })).toBe(true);
  });
});
