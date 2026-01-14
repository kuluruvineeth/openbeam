import { describe, expect, it, mock } from "bun:test";
import type {
  MediaChapter,
  MediaHighlight,
  MediaMetadata,
  MediaSearchResult,
  MediaTranscriptSegment,
  ToolServices,
} from "../../../services";
import type { ToolContext } from "../../../types";
import { mediaChaptersTool, mediaHighlightsTool } from "../structure";
import {
  mediaTranscriptTimestampsTool,
  mediaTranscriptTool,
} from "../transcript";

function createMockSearchResult(
  overrides: Partial<MediaSearchResult> = {}
): MediaSearchResult {
  return {
    videoId: "video_123",
    score: 0.95,
    startSec: 30,
    endSec: 45,
    confidence: "high",
    thumbnailUrl: "https://example.com/thumb.jpg",
    ...overrides,
  };
}

function createMockChapter(
  overrides: Partial<MediaChapter> = {}
): MediaChapter {
  return {
    title: "Introduction",
    start: 0,
    end: 120,
    ...overrides,
  };
}

function createMockHighlight(
  overrides: Partial<MediaHighlight> = {}
): MediaHighlight {
  return {
    description: "Key insight about product strategy",
    start: 300,
    end: 330,
    ...overrides,
  };
}

function createMockSegment(
  overrides: Partial<MediaTranscriptSegment> = {}
): MediaTranscriptSegment {
  return {
    start: 0,
    end: 5,
    value: "Hello and welcome to this video.",
    ...overrides,
  };
}

function createMockMetadata(
  overrides: Partial<MediaMetadata> = {}
): MediaMetadata {
  return {
    summary: "A comprehensive overview of the product roadmap.",
    keywords: ["product", "roadmap", "strategy"],
    duration: 1800,
    thumbnailUrl: "https://example.com/thumb.jpg",
    chapters: [
      createMockChapter(),
      createMockChapter({ title: "Main Content", start: 120, end: 1500 }),
    ],
    highlights: [createMockHighlight()],
    ...overrides,
  };
}

function createNotUsed(): never {
  throw new Error("not used");
}

function createMockServices(
  overrides: Partial<ToolServices["media"]> = {}
): ToolServices {
  return {
    media: {
      searchByText: mock(() =>
        Promise.resolve([createMockSearchResult(), createMockSearchResult()])
      ),
      searchByImage: mock(() => Promise.resolve([createMockSearchResult()])),
      getTranscript: mock(() =>
        Promise.resolve("Hello and welcome. Today we discuss important topics.")
      ),
      getTranscriptWithTimestamps: mock(() =>
        Promise.resolve([
          createMockSegment(),
          createMockSegment({
            start: 5,
            end: 10,
            value: "Today we discuss important topics.",
          }),
        ])
      ),
      getMetadata: mock(() => Promise.resolve(createMockMetadata())),
      analyze: mock(() => Promise.resolve("Video analysis complete")),
      getSummary: mock(() => Promise.resolve("This video covers the roadmap.")),
      getChapters: mock(() =>
        Promise.resolve([
          createMockChapter(),
          createMockChapter({ title: "Conclusion", start: 1500, end: 1800 }),
        ])
      ),
      getHighlights: mock(() =>
        Promise.resolve([
          createMockHighlight(),
          createMockHighlight({
            description: "Another key moment",
            start: 600,
          }),
        ])
      ),
      ...overrides,
    },
    storage: {
      list: createNotUsed,
      getSignedUrl: createNotUsed,
      exists: createNotUsed,
      getMetadata: createNotUsed,
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

describe("mediaTranscriptTool", () => {
  describe("successful transcript retrieval", () => {
    it("returns full transcript with stats", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.videoId).toBe("video_123");
      expect(result.data?.transcript).toContain("Hello and welcome");
      expect(result.data?.characterCount).toBeGreaterThan(0);
      expect(result.data?.wordCount).toBeGreaterThan(0);
    });

    it("calculates word count correctly", async () => {
      const services = createMockServices({
        getTranscript: mock(() => Promise.resolve("one two three four five")),
      });
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.data?.wordCount).toBe(5);
    });
  });

  describe("transcript not found", () => {
    it("fails when no transcript available", async () => {
      const services = createMockServices({
        getTranscript: mock(() => Promise.resolve(null)),
      });
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await mediaTranscriptTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});

describe("mediaTranscriptTimestampsTool", () => {
  describe("successful timestamped transcript", () => {
    it("returns segments with formatted timestamps", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTimestampsTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.segmentCount).toBe(2);
      expect(result.data?.segments).toHaveLength(2);
    });

    it("formats timestamps correctly", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTimestampsTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      const firstSegment = result.data?.segments[0];
      expect(firstSegment?.startFormatted).toBe("0:00");
      expect(firstSegment?.endFormatted).toBe("0:05");
    });

    it("formats hour timestamps correctly", async () => {
      const services = createMockServices({
        getTranscriptWithTimestamps: mock(() =>
          Promise.resolve([
            createMockSegment({
              start: 3661,
              end: 3700,
              value: "Late segment",
            }),
          ])
        ),
      });
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTimestampsTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      const segment = result.data?.segments[0];
      expect(segment?.startFormatted).toBe("1:01:01");
    });

    it("calculates total duration from last segment", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTimestampsTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.data?.totalDuration).toBe(10);
    });
  });

  describe("empty transcript", () => {
    it("fails when no segments available", async () => {
      const services = createMockServices({
        getTranscriptWithTimestamps: mock(() => Promise.resolve([])),
      });
      const ctx = createMockContext(services);

      const result = await mediaTranscriptTimestampsTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await mediaTranscriptTimestampsTool.execute(
        { indexId: "index_1", videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});

describe("mediaChaptersTool", () => {
  describe("successful chapter retrieval", () => {
    it("returns chapters with formatted timestamps", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaChaptersTool.execute(
        { videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.chapterCount).toBe(2);
      expect(result.data?.chapters).toHaveLength(2);
    });

    it("includes chapter details", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaChaptersTool.execute(
        { videoId: "video_123" },
        ctx
      );

      const firstChapter = result.data?.chapters[0];
      expect(firstChapter?.number).toBe(1);
      expect(firstChapter?.title).toBe("Introduction");
      expect(firstChapter?.startSec).toBe(0);
      expect(firstChapter?.endSec).toBe(120);
      expect(firstChapter?.duration).toBe(120);
      expect(firstChapter?.startFormatted).toBe("0:00");
    });
  });

  describe("no chapters detected", () => {
    it("returns empty with message when no chapters", async () => {
      const services = createMockServices({
        getChapters: mock(() => Promise.resolve([])),
      });
      const ctx = createMockContext(services);

      const result = await mediaChaptersTool.execute(
        { videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.chapterCount).toBe(0);
      expect(result.data?.message).toBe("No chapters detected in this video");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await mediaChaptersTool.execute(
        { videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});

describe("mediaHighlightsTool", () => {
  describe("successful highlight retrieval", () => {
    it("returns highlights with formatted timestamps", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaHighlightsTool.execute(
        { videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.highlightCount).toBe(2);
      expect(result.data?.highlights).toHaveLength(2);
    });

    it("includes highlight details", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await mediaHighlightsTool.execute(
        { videoId: "video_123" },
        ctx
      );

      const firstHighlight = result.data?.highlights[0];
      expect(firstHighlight?.number).toBe(1);
      expect(firstHighlight?.description).toContain("Key insight");
      expect(firstHighlight?.startSec).toBe(300);
      expect(firstHighlight?.startFormatted).toBe("5:00");
      expect(firstHighlight?.duration).toBe(30);
    });
  });

  describe("no highlights detected", () => {
    it("returns empty with message when no highlights", async () => {
      const services = createMockServices({
        getHighlights: mock(() => Promise.resolve([])),
      });
      const ctx = createMockContext(services);

      const result = await mediaHighlightsTool.execute(
        { videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.highlightCount).toBe(0);
      expect(result.data?.message).toBe("No highlights detected in this video");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await mediaHighlightsTool.execute(
        { videoId: "video_123" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});
