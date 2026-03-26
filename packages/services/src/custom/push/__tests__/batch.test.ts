import { describe, expect, mock, test } from "bun:test";
import type { PushDocument } from "@openbeam/types/services/connectors/custom";
import type { FieldMapperContext } from "../field-mapper";

const mockFeedSingleDocument = mock(() =>
  Promise.resolve({
    success: true,
    validation: { valid: true, errors: [], warnings: [] },
  })
);

mock.module("@openbeam/vespa", () => ({
  feedSingleDocument: mockFeedSingleDocument,
}));

mock.module("../../../lib/logger", () => ({
  createServiceLogger: () => ({
    info: Function.prototype,
    error: Function.prototype,
    warn: Function.prototype,
    debug: Function.prototype,
  }),
}));

const { pushBatch } = await import("../batch");

const BASE_CTX: FieldMapperContext = {
  connectorId: "conn_test",
  teamId: "team_test",
  workspaceId: "ws_test",
  defaultDocumentType: "custom_document",
  defaultIsPublic: false,
  fieldMappings: {},
};

describe("pushBatch", () => {
  test("pushes all documents successfully", async () => {
    mockFeedSingleDocument.mockResolvedValue({
      success: true,
      validation: { valid: true, errors: [], warnings: [] },
    });

    const docs: PushDocument[] = Array.from({ length: 5 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Doc ${i}`,
      content: `Content ${i}`,
    }));

    const result = await pushBatch(docs, BASE_CTX);

    expect(result.total).toBe(5);
    expect(result.succeeded).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(5);
    expect(result.results.every((r) => r.success)).toBe(true);
  });

  test("handles partial failures", async () => {
    let callCount = 0;
    mockFeedSingleDocument.mockImplementation(() => {
      callCount += 1;
      if (callCount % 3 === 0) {
        return Promise.resolve({
          success: false,
          validation: { valid: true, errors: [], warnings: [] },
          error: "Vespa unavailable",
        });
      }
      return Promise.resolve({
        success: true,
        validation: { valid: true, errors: [], warnings: [] },
      });
    });

    const docs: PushDocument[] = Array.from({ length: 6 }, (_, i) => ({
      id: `fail-${i}`,
      title: `Doc ${i}`,
      content: `Content ${i}`,
    }));

    const result = await pushBatch(docs, BASE_CTX);

    expect(result.total).toBe(6);
    expect(result.succeeded).toBe(4);
    expect(result.failed).toBe(2);
    expect(result.results.filter((r) => !r.success)).toHaveLength(2);
  });

  test("handles thrown errors gracefully", async () => {
    mockFeedSingleDocument.mockRejectedValue(new Error("Connection refused"));

    const docs: PushDocument[] = [
      { id: "err-1", title: "Error Doc", content: "Content" },
    ];

    const result = await pushBatch(docs, BASE_CTX);

    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    const firstResult = result.results[0];
    expect(firstResult).toBeDefined();
    expect(firstResult?.success).toBe(false);
    expect(firstResult?.error).toBe("Connection refused");
  });

  test("handles empty batch", async () => {
    const result = await pushBatch([], BASE_CTX);

    expect(result.total).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});
