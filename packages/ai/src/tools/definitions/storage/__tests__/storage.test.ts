import { describe, expect, it, mock } from "bun:test";
import type {
  StorageListResult,
  StorageObject,
  ToolServices,
} from "../../../services";
import type { ToolContext } from "../../../types";
import { storageExistsTool } from "../exists";
import { storageListTool } from "../list";
import { storageSignedUrlTool } from "../signed-url";

function createMockStorageObject(
  overrides: Partial<StorageObject> = {}
): StorageObject {
  return {
    key: "documents/report.pdf",
    size: 1024 * 50,
    lastModified: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

function createMockListResult(
  overrides: Partial<StorageListResult> = {}
): StorageListResult {
  return {
    objects: [
      createMockStorageObject({ key: "documents/report.pdf" }),
      createMockStorageObject({ key: "documents/notes.txt", size: 512 }),
    ],
    nextCursor: undefined,
    commonPrefixes: [],
    ...overrides,
  };
}

function createNotUsed(): never {
  throw new Error("not used");
}

function createMockServices(
  overrides: Partial<ToolServices["storage"]> = {}
): ToolServices {
  return {
    storage: {
      list: mock(() => Promise.resolve(createMockListResult())),
      getSignedUrl: mock(() =>
        Promise.resolve("https://storage.example.com/signed-url")
      ),
      exists: mock(() => Promise.resolve(true)),
      getMetadata: mock(() => Promise.resolve(createMockStorageObject())),
      ...overrides,
    },
    connectors: {
      list: createNotUsed,
      get: createNotUsed,
      getSyncHistory: createNotUsed,
      getSyncHistoryPaginated: createNotUsed,
      triggerSync: createNotUsed,
      getSyncJobStatus: createNotUsed,
      pause: createNotUsed,
      resume: createNotUsed,
    },
    search: {
      hybrid: createNotUsed,
      semantic: createNotUsed,
      keyword: createNotUsed,
      unified: createNotUsed,
      export: createNotUsed,
      save: createNotUsed,
    },
    rag: {
      answer: createNotUsed,
      synthesize: createNotUsed,
      analyzeQuery: createNotUsed,
      verifyGrounding: createNotUsed,
    },
    documents: {
      get: createNotUsed,
      list: createNotUsed,
      getChunks: createNotUsed,
      export: createNotUsed,
      share: createNotUsed,
    },
    discovery: {
      getCapabilities: createNotUsed,
    },
    context: {
      storeVirtualFile: createNotUsed,
      retrieveVirtualFile: createNotUsed,
      retrieveVirtualFileChunk: createNotUsed,
      listVirtualFiles: createNotUsed,
      deleteVirtualFile: createNotUsed,
    },
    analytics: {
      getSpreadsheetSchema: createNotUsed,
      generateSql: createNotUsed,
      executeQuery: createNotUsed,
    },
    preferences: {
      get: createNotUsed,
      update: createNotUsed,
    },
    media: {
      searchByText: createNotUsed,
      searchByImage: createNotUsed,
      getTranscript: createNotUsed,
      getTranscriptWithTimestamps: createNotUsed,
      getMetadata: createNotUsed,
      analyze: createNotUsed,
      getSummary: createNotUsed,
      getChapters: createNotUsed,
      getHighlights: createNotUsed,
    },
    integrations: {
      listAvailable: createNotUsed,
      getCapabilities: createNotUsed,
    },
  };
}

function createMockContext(
  services: ToolServices,
  overrides: Partial<ToolContext> = {}
): ToolContext {
  return {
    teamId: "team_123",
    userId: "user_456",
    services,
    ...overrides,
  };
}

describe("storageListTool", () => {
  describe("successful listing", () => {
    it("lists files with default options", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await storageListTool.execute({ limit: 100 }, ctx);

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);
      expect(result.data?.objects).toHaveLength(2);
      expect(result.data?.hasMore).toBe(false);
    });

    it("filters by prefix", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      await storageListTool.execute({ prefix: "documents/", limit: 100 }, ctx);

      expect(services.storage.list).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: "documents/" })
      );
    });

    it("respects limit parameter", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      await storageListTool.execute({ limit: 50 }, ctx);

      expect(services.storage.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });

    it("handles pagination cursor", async () => {
      const services = createMockServices({
        list: mock(() =>
          Promise.resolve(createMockListResult({ nextCursor: "cursor_abc" }))
        ),
      });
      const ctx = createMockContext(services);

      const result = await storageListTool.execute({ limit: 100 }, ctx);

      expect(result.data?.nextCursor).toBe("cursor_abc");
      expect(result.data?.hasMore).toBe(true);
    });

    it("returns common prefixes for directory-like browsing", async () => {
      const services = createMockServices({
        list: mock(() =>
          Promise.resolve(
            createMockListResult({
              commonPrefixes: ["documents/", "images/", "data/"],
            })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await storageListTool.execute({ limit: 100 }, ctx);

      expect(result.data?.commonPrefixes).toEqual([
        "documents/",
        "images/",
        "data/",
      ]);
    });

    it("formats object metadata correctly", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await storageListTool.execute({ limit: 100 }, ctx);

      const firstObject = result.data?.objects[0];
      expect(firstObject?.key).toBe("documents/report.pdf");
      expect(firstObject?.size).toBe(1024 * 50);
      expect(firstObject?.lastModified).toBe("2024-01-15T10:00:00.000Z");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await storageListTool.execute({ limit: 100 }, ctx);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});

describe("storageSignedUrlTool", () => {
  describe("successful URL generation", () => {
    it("generates signed URL for existing file", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await storageSignedUrlTool.execute(
        { key: "documents/report.pdf", expiresIn: 3600 },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe("https://storage.example.com/signed-url");
      expect(result.data?.key).toBe("documents/report.pdf");
    });

    it("uses specified expiration time", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await storageSignedUrlTool.execute(
        { key: "documents/report.pdf", expiresIn: 3600 },
        ctx
      );

      expect(result.data?.expiresInSeconds).toBe(3600);
      expect(services.storage.getSignedUrl).toHaveBeenCalled();
    });

    it("respects custom expiration time", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      await storageSignedUrlTool.execute(
        { key: "documents/report.pdf", expiresIn: 7200 },
        ctx
      );

      expect(services.storage.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({ expiresIn: 7200 })
      );
    });

    it("includes expiration timestamp in response", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await storageSignedUrlTool.execute(
        { key: "documents/report.pdf", expiresIn: 3600 },
        ctx
      );

      expect(result.data?.expiresAt).toBeDefined();
      const expiresAt = new Date(result.data?.expiresAt ?? "");
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("file validation", () => {
    it("fails when file does not exist", async () => {
      const services = createMockServices({
        exists: mock(() => Promise.resolve(false)),
      });
      const ctx = createMockContext(services);

      const result = await storageSignedUrlTool.execute(
        { key: "missing/file.pdf", expiresIn: 3600 },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
      expect(result.error?.message).toContain("missing/file.pdf");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await storageSignedUrlTool.execute(
        { key: "documents/report.pdf", expiresIn: 3600 },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});

describe("storageExistsTool", () => {
  describe("file existence check", () => {
    it("returns true when file exists with metadata", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await storageExistsTool.execute(
        { key: "documents/report.pdf" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.exists).toBe(true);
      expect(result.data?.key).toBe("documents/report.pdf");
      const data = result.data as {
        key: string;
        exists: boolean;
        size?: number;
        lastModified?: string;
      };
      expect(data.size).toBe(1024 * 50);
      expect(data.lastModified).toBe("2024-01-15T10:00:00.000Z");
    });

    it("returns false when file does not exist", async () => {
      const services = createMockServices({
        exists: mock(() => Promise.resolve(false)),
      });
      const ctx = createMockContext(services);

      const result = await storageExistsTool.execute(
        { key: "missing/file.pdf" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.exists).toBe(false);
      const data = result.data as {
        key: string;
        exists: boolean;
        size?: number;
      };
      expect(data.size).toBeUndefined();
    });

    it("handles missing metadata gracefully", async () => {
      const services = createMockServices({
        getMetadata: mock(() => Promise.resolve(null)),
      });
      const ctx = createMockContext(services);

      const result = await storageExistsTool.execute(
        { key: "documents/report.pdf" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.exists).toBe(true);
      const data = result.data as {
        key: string;
        exists: boolean;
        size?: number;
      };
      expect(data.size).toBeUndefined();
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await storageExistsTool.execute(
        { key: "documents/report.pdf" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});
