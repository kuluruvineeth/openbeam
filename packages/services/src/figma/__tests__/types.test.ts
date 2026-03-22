import { describe, expect, it } from "bun:test";
import {
  FigmaCommentSchema,
  FigmaFileDetailSchema,
  FigmaFileMetaSchema,
  FigmaSyncCursorSchema,
} from "@openbeam/types/services/connectors/figma";

describe("Figma Zod Schemas", () => {
  it("validates a file meta object", () => {
    const result = FigmaFileMetaSchema.safeParse({
      key: "abc123",
      name: "Test File",
      thumbnail_url: "https://example.com/thumb.png",
      last_modified: "2026-03-01T10:00:00Z",
    });

    expect(result.success).toBe(true);
  });

  it("validates file meta without thumbnail", () => {
    const result = FigmaFileMetaSchema.safeParse({
      key: "abc",
      name: "No Thumb",
      last_modified: "2026-01-01T00:00:00Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects file meta missing required fields", () => {
    const result = FigmaFileMetaSchema.safeParse({
      key: "abc",
    });

    expect(result.success).toBe(false);
  });

  it("validates a comment object", () => {
    const result = FigmaCommentSchema.safeParse({
      id: "1",
      message: "Looks good",
      user: { id: "u1", handle: "alice" },
      created_at: "2026-03-15T10:00:00Z",
      resolved_at: null,
    });

    expect(result.success).toBe(true);
  });

  it("validates a file detail object", () => {
    const result = FigmaFileDetailSchema.safeParse({
      name: "Design",
      lastModified: "2026-03-01T10:00:00Z",
      version: "1",
      role: "editor",
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [{ id: "1:1", name: "Page 1", type: "CANVAS" }],
      },
    });

    expect(result.success).toBe(true);
  });

  it("validates a sync cursor", () => {
    const result = FigmaSyncCursorSchema.safeParse({
      lastSyncTime: 1_711_000_000_000,
      processedProjects: ["p1", "p2"],
    });

    expect(result.success).toBe(true);
  });

  it("validates an empty sync cursor", () => {
    const result = FigmaSyncCursorSchema.safeParse({});

    expect(result.success).toBe(true);
  });
});
