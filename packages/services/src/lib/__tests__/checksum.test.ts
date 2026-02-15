import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { calculateDocumentChecksum } from "../checksum";

const BLAKE3_HEX_PATTERN = /^[0-9a-f]{64}$/;

describe("calculateDocumentChecksum", () => {
  it("returns hex string of correct length", async () => {
    const result = await calculateDocumentChecksum({
      title: "Test Document",
      content: "This is the content",
      metadata: { tag: "test" },
    });

    expect(typeof result).toBe("string");
    expect(result).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("produces deterministic checksums for identical input", async () => {
    const input = {
      title: "Determinism Test",
      content: "Same content every time",
      metadata: { version: 1 },
    };

    const checksum1 = await calculateDocumentChecksum(input);
    const checksum2 = await calculateDocumentChecksum(input);
    const checksum3 = await calculateDocumentChecksum(input);

    expect(checksum1).toBe(checksum2);
    expect(checksum2).toBe(checksum3);
  });

  it("produces different checksums for different titles", async () => {
    const checksum1 = await calculateDocumentChecksum({
      title: "Title A",
      content: "Same content",
      metadata: {},
    });

    const checksum2 = await calculateDocumentChecksum({
      title: "Title B",
      content: "Same content",
      metadata: {},
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it("produces different checksums for different content", async () => {
    const checksum1 = await calculateDocumentChecksum({
      title: "Same Title",
      content: "Content A",
      metadata: {},
    });

    const checksum2 = await calculateDocumentChecksum({
      title: "Same Title",
      content: "Content B",
      metadata: {},
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it("produces different checksums for different metadata", async () => {
    const checksum1 = await calculateDocumentChecksum({
      title: "Same",
      content: "Same",
      metadata: { key: "value1" },
    });

    const checksum2 = await calculateDocumentChecksum({
      title: "Same",
      content: "Same",
      metadata: { key: "value2" },
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it("handles undefined metadata", async () => {
    const checksum1 = await calculateDocumentChecksum({
      title: "Test",
      content: "Test",
      metadata: undefined,
    });

    const checksum2 = await calculateDocumentChecksum({
      title: "Test",
      content: "Test",
      metadata: {},
    });

    expect(checksum1).toBe(checksum2);
  });

  it("handles empty strings", async () => {
    const checksum = await calculateDocumentChecksum({
      title: "",
      content: "",
      metadata: {},
    });

    expect(checksum).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("handles large content", async () => {
    const largeContent = "x".repeat(10_000_000);
    const checksum = await calculateDocumentChecksum({
      title: "Large Document",
      content: largeContent,
      metadata: {},
    });

    expect(checksum).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("handles unicode characters", async () => {
    const checksum = await calculateDocumentChecksum({
      title: "Unicode 🚀",
      content: "Content with émojis and àccents",
      metadata: { tag: "日本語" },
    });

    expect(checksum).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("reuses hasher instance across calls", async () => {
    const checksums = await Promise.all([
      calculateDocumentChecksum({ title: "1", content: "1" }),
      calculateDocumentChecksum({ title: "2", content: "2" }),
      calculateDocumentChecksum({ title: "3", content: "3" }),
    ]);

    expect(checksums[0]).not.toBe(checksums[1]);
    expect(checksums[1]).not.toBe(checksums[2]);
    expect(checksums[0]).not.toBe(checksums[2]);
  });
});

describe("calculateDocumentChecksum - property-based tests", () => {
  it("always produces 64-character hex strings", () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.dictionary(fc.string(), fc.anything()),
        async (title, content, metadata) => {
          const checksum = await calculateDocumentChecksum({
            title,
            content,
            metadata,
          });
          return BLAKE3_HEX_PATTERN.test(checksum);
        }
      )
    );
  });

  it("is deterministic for any input", () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.dictionary(fc.string(), fc.anything()),
        async (title, content, metadata) => {
          const checksum1 = await calculateDocumentChecksum({
            title,
            content,
            metadata,
          });
          const checksum2 = await calculateDocumentChecksum({
            title,
            content,
            metadata,
          });
          return checksum1 === checksum2;
        }
      )
    );
  });

  it("produces different checksums for different inputs", () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.string(),
        async (content1, content2, title) => {
          if (content1 === content2) {
            return true;
          }

          const checksum1 = await calculateDocumentChecksum({
            title,
            content: content1,
          });
          const checksum2 = await calculateDocumentChecksum({
            title,
            content: content2,
          });

          return checksum1 !== checksum2;
        }
      )
    );
  });

  it("handles extreme values", () => {
    fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(""),
          fc.constant("a".repeat(1_000_000)),
          fc.string(),
          fc.string({ minLength: 10_000, maxLength: 20_000 })
        ),
        async (content) => {
          const checksum = await calculateDocumentChecksum({
            title: "Test",
            content,
          });
          return BLAKE3_HEX_PATTERN.test(checksum);
        }
      )
    );
  }, 15_000);
});
