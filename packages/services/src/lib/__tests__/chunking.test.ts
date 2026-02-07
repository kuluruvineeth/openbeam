import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import {
  type Chunk,
  calculateLargeFileChecksum,
  RabinChunker,
} from "../chunking";

const BLAKE3_HEX_PATTERN = /^[0-9a-f]{64}$/;

describe("RabinChunker", () => {
  it("produces chunks for small input", async () => {
    const data = new Uint8Array(1024 * 1024);
    data.fill(65);

    const chunker = new RabinChunker();
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
  });

  it("produces consistent chunks for identical input", async () => {
    const data = new Uint8Array(5 * 1024 * 1024);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }

    const chunker1 = new RabinChunker();
    const chunks1: Array<{ offset: number; length: number; hash: string }> = [];
    for await (const chunk of chunker1.chunk(data)) {
      chunks1.push({
        offset: chunk.offset,
        length: chunk.length,
        hash: chunk.hash,
      });
    }

    const chunker2 = new RabinChunker();
    const chunks2: Array<{ offset: number; length: number; hash: string }> = [];
    for await (const chunk of chunker2.chunk(data)) {
      chunks2.push({
        offset: chunk.offset,
        length: chunk.length,
        hash: chunk.hash,
      });
    }

    expect(chunks1.length).toBe(chunks2.length);
    for (let i = 0; i < chunks1.length; i++) {
      expect(chunks1[i]?.offset).toBe(chunks2[i]?.offset);
      expect(chunks1[i]?.length).toBe(chunks2[i]?.length);
      expect(chunks1[i]?.hash).toBe(chunks2[i]?.hash);
    }
  });

  it("respects minimum chunk size", async () => {
    const minSize = 1 * 1024 * 1024;
    const data = new Uint8Array(10 * 1024 * 1024);
    data.fill(0);

    const chunker = new RabinChunker({ minChunkSize: minSize });
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.length).toBeGreaterThanOrEqual(minSize);
    }
  });

  it("respects maximum chunk size", async () => {
    const maxSize = 4 * 1024 * 1024;
    const data = new Uint8Array(20 * 1024 * 1024);
    data.fill(0);

    const chunker = new RabinChunker({ maxChunkSize: maxSize });
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(maxSize);
    }
  });

  it("detects content boundaries correctly", async () => {
    const data = new Uint8Array(10 * 1024 * 1024);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }

    const chunker = new RabinChunker();
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(1);

    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }
    expect(totalLength).toBe(data.length);
  });

  it("generates valid hashes for each chunk", async () => {
    const data = new Uint8Array(5 * 1024 * 1024);
    data.fill(42);

    const chunker = new RabinChunker();
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    for (const chunk of chunks) {
      expect(chunk.hash).toMatch(BLAKE3_HEX_PATTERN);
      expect(chunk.hash.length).toBe(64);
    }
  });

  it("handles zero-length input", async () => {
    const data = new Uint8Array(0);
    const chunker = new RabinChunker();
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(0);
  });

  it("handles single-byte input", async () => {
    const data = new Uint8Array(1);
    data[0] = 65;

    const chunker = new RabinChunker();
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(1);
    expect(chunks[0]?.length).toBe(1);
    expect(chunks[0]?.offset).toBe(0);
  });

  it("produces different chunks for different content at same position", async () => {
    const data1 = new Uint8Array(10 * 1024 * 1024);
    const data2 = new Uint8Array(10 * 1024 * 1024);

    for (let i = 0; i < data1.length; i++) {
      data1[i] = i % 256;
      data2[i] = (i + 1) % 256;
    }

    const chunker1 = new RabinChunker();
    const chunks1: string[] = [];
    for await (const chunk of chunker1.chunk(data1)) {
      chunks1.push(chunk.hash);
    }

    const chunker2 = new RabinChunker();
    const chunks2: string[] = [];
    for await (const chunk of chunker2.chunk(data2)) {
      chunks2.push(chunk.hash);
    }

    let differentHashes = 0;
    const minLength = Math.min(chunks1.length, chunks2.length);
    for (let i = 0; i < minLength; i++) {
      if (chunks1[i] !== chunks2[i]) {
        differentHashes += 1;
      }
    }

    expect(differentHashes).toBeGreaterThan(0);
  });

  it("maintains chunk offset continuity", async () => {
    const data = new Uint8Array(10 * 1024 * 1024);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }

    const chunker = new RabinChunker();
    const chunks: Chunk[] = [];

    for await (const chunk of chunker.chunk(data)) {
      chunks.push(chunk);
    }

    let expectedOffset = 0;
    for (const chunk of chunks) {
      expect(chunk.offset).toBe(expectedOffset);
      expectedOffset += chunk.length;
    }

    expect(expectedOffset).toBe(data.length);
  });
});

describe("calculateLargeFileChecksum", () => {
  it("uses fast path for small files", async () => {
    const data = new Uint8Array(5 * 1024 * 1024);
    data.fill(65);

    const checksum = await calculateLargeFileChecksum(data);
    expect(checksum).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("uses chunking path for large files", async () => {
    const data = new Uint8Array(15 * 1024 * 1024);
    data.fill(65);

    const checksum = await calculateLargeFileChecksum(data);
    expect(checksum).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("produces deterministic checksums for identical content", async () => {
    const data = new Uint8Array(15 * 1024 * 1024);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }

    const checksum1 = await calculateLargeFileChecksum(data);
    const checksum2 = await calculateLargeFileChecksum(data);

    expect(checksum1).toBe(checksum2);
  });

  it("produces different checksums for different content", async () => {
    const data1 = new Uint8Array(15 * 1024 * 1024);
    const data2 = new Uint8Array(15 * 1024 * 1024);

    data1.fill(65);
    data2.fill(66);

    const checksum1 = await calculateLargeFileChecksum(data1);
    const checksum2 = await calculateLargeFileChecksum(data2);

    expect(checksum1).not.toBe(checksum2);
  });

  it("respects custom threshold", async () => {
    const data = new Uint8Array(5 * 1024 * 1024);
    data.fill(42);

    const checksum1 = await calculateLargeFileChecksum(data, {
      threshold: 1 * 1024 * 1024,
    });
    const checksum2 = await calculateLargeFileChecksum(data, {
      threshold: 10 * 1024 * 1024,
    });

    expect(checksum1).toMatch(BLAKE3_HEX_PATTERN);
    expect(checksum2).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("handles empty input", async () => {
    const data = new Uint8Array(0);
    const checksum = await calculateLargeFileChecksum(data);
    expect(checksum).toMatch(BLAKE3_HEX_PATTERN);
  });

  it("handles boundary case at threshold", async () => {
    const threshold = 10 * 1024 * 1024;
    const data = new Uint8Array(threshold);
    data.fill(42);

    const checksum = await calculateLargeFileChecksum(data, { threshold });
    expect(checksum).toMatch(BLAKE3_HEX_PATTERN);
  });
});

describe("RabinChunker - property-based tests", () => {
  it("produces consistent chunks for identical input", () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 10_000, maxLength: 100_000 }),
        async (data) => {
          const chunker1 = new RabinChunker();
          const chunks1: string[] = [];
          for await (const chunk of chunker1.chunk(data)) {
            chunks1.push(chunk.hash);
          }

          const chunker2 = new RabinChunker();
          const chunks2: string[] = [];
          for await (const chunk of chunker2.chunk(data)) {
            chunks2.push(chunk.hash);
          }

          return JSON.stringify(chunks1) === JSON.stringify(chunks2);
        }
      ),
      { numRuns: 5 }
    );
  });

  it("always produces valid chunk hashes", () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1000, maxLength: 50_000 }),
        async (data) => {
          const chunker = new RabinChunker();
          const chunks: Chunk[] = [];

          for await (const chunk of chunker.chunk(data)) {
            chunks.push(chunk);
          }

          return chunks.every((chunk) => BLAKE3_HEX_PATTERN.test(chunk.hash));
        }
      ),
      { numRuns: 10 }
    );
  });

  it("total chunk length equals input length", () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1000, maxLength: 50_000 }),
        async (data) => {
          const chunker = new RabinChunker();
          let totalLength = 0;

          for await (const chunk of chunker.chunk(data)) {
            totalLength += chunk.length;
          }

          return totalLength === data.length;
        }
      ),
      { numRuns: 10 }
    );
  });

  it("chunk offsets are continuous", () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1000, maxLength: 50_000 }),
        async (data) => {
          const chunker = new RabinChunker();
          const chunks: Chunk[] = [];

          for await (const chunk of chunker.chunk(data)) {
            chunks.push(chunk);
          }

          let expectedOffset = 0;
          for (const chunk of chunks) {
            if (chunk.offset !== expectedOffset) {
              return false;
            }
            expectedOffset += chunk.length;
          }

          return expectedOffset === data.length;
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe("calculateLargeFileChecksum - property-based tests", () => {
  it("is deterministic for any input", () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 0, maxLength: 100_000 }),
        async (data) => {
          const checksum1 = await calculateLargeFileChecksum(data);
          const checksum2 = await calculateLargeFileChecksum(data);
          return checksum1 === checksum2;
        }
      ),
      { numRuns: 10 }
    );
  });

  it("always produces 64-character hex strings", () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 0, maxLength: 100_000 }),
        async (data) => {
          const checksum = await calculateLargeFileChecksum(data);
          return BLAKE3_HEX_PATTERN.test(checksum);
        }
      ),
      { numRuns: 10 }
    );
  });

  it("produces different checksums for different inputs", () => {
    fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1000, maxLength: 50_000 }),
        fc.uint8Array({ minLength: 1000, maxLength: 50_000 }),
        async (data1, data2) => {
          if (data1.every((v, i) => v === data2[i])) {
            return true;
          }

          const checksum1 = await calculateLargeFileChecksum(data1);
          const checksum2 = await calculateLargeFileChecksum(data2);

          return checksum1 !== checksum2;
        }
      ),
      { numRuns: 5 }
    );
  });
});
