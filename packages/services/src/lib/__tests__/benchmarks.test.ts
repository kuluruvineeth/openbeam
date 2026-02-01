import { describe, expect, it } from "bun:test";
import { createBLAKE3, createSHA256 } from "hash-wasm";
import { BloomFilter } from "../bloom-filter";
import { calculateDocumentChecksum } from "../checksum";
import { RabinChunker } from "../chunking";

interface HashBenchmarkResult {
  algorithm: string;
  size: string;
  throughputMBps: number;
  durationMs: number;
  iterations: number;
}

interface ChunkingBenchmarkResult {
  strategy: string;
  fileSize: string;
  throughputMBps: number;
  durationMs: number;
  chunksProduced: number;
}

interface BloomFilterBenchmarkResult {
  operation: string;
  itemCount: number;
  throughputOpsPerSec: number;
  durationMs: number;
  memoryUsageBytes: number;
  falsePositiveRate?: number;
}

interface DeduplicationBenchmarkResult {
  strategy: string;
  documentCount: number;
  throughputDocsPerMin: number;
  durationMs: number;
  speedupFactor?: number;
}

function generateRandomData(sizeBytes: number): Uint8Array {
  const data = new Uint8Array(sizeBytes);
  for (let i = 0; i < sizeBytes; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return data;
}

async function benchmarkHashing(): Promise<HashBenchmarkResult[]> {
  const results: HashBenchmarkResult[] = [];
  const sizes = [
    { bytes: 1024, label: "1KB" },
    { bytes: 10 * 1024, label: "10KB" },
    { bytes: 100 * 1024, label: "100KB" },
    { bytes: 1024 * 1024, label: "1MB" },
    { bytes: 10 * 1024 * 1024, label: "10MB" },
    { bytes: 100 * 1024 * 1024, label: "100MB" },
  ];

  for (const { bytes, label } of sizes) {
    const data = generateRandomData(bytes);
    const iterations = bytes > 1024 * 1024 ? 10 : 100;

    const blake3Hasher = await createBLAKE3();
    const blake3Start = performance.now();
    for (let i = 0; i < iterations; i++) {
      blake3Hasher.init();
      blake3Hasher.update(data);
      blake3Hasher.digest("hex");
    }
    const blake3Duration = performance.now() - blake3Start;
    const blake3Throughput =
      (bytes * iterations) / (blake3Duration / 1000) / (1024 * 1024);

    results.push({
      algorithm: "BLAKE3",
      size: label,
      throughputMBps: Math.round(blake3Throughput),
      durationMs: Math.round(blake3Duration),
      iterations,
    });

    const sha256Hasher = await createSHA256();
    const sha256Start = performance.now();
    for (let i = 0; i < iterations; i++) {
      sha256Hasher.init();
      sha256Hasher.update(data);
      sha256Hasher.digest("hex");
    }
    const sha256Duration = performance.now() - sha256Start;
    const sha256Throughput =
      (bytes * iterations) / (sha256Duration / 1000) / (1024 * 1024);

    results.push({
      algorithm: "SHA-256",
      size: label,
      throughputMBps: Math.round(sha256Throughput),
      durationMs: Math.round(sha256Duration),
      iterations,
    });
  }

  return results;
}

async function benchmarkChunking(): Promise<ChunkingBenchmarkResult[]> {
  const results: ChunkingBenchmarkResult[] = [];
  const sizes = [
    { bytes: 1024 * 1024, label: "1MB" },
    { bytes: 10 * 1024 * 1024, label: "10MB" },
    { bytes: 100 * 1024 * 1024, label: "100MB" },
  ];

  for (const { bytes, label } of sizes) {
    const data = generateRandomData(bytes);

    const fixedStart = performance.now();
    const fixedChunkSize = 4 * 1024 * 1024;
    let fixedChunks = 0;
    for (let i = 0; i < data.length; i += fixedChunkSize) {
      fixedChunks += 1;
    }
    const fixedDuration = performance.now() - fixedStart;
    const fixedThroughput = bytes / (fixedDuration / 1000) / (1024 * 1024);

    results.push({
      strategy: "Fixed-Size",
      fileSize: label,
      throughputMBps: Math.round(fixedThroughput),
      durationMs: Math.round(fixedDuration),
      chunksProduced: fixedChunks,
    });

    const chunker = new RabinChunker();
    const rabinStart = performance.now();
    let rabinChunks = 0;
    for await (const _ of chunker.chunk(data)) {
      rabinChunks += 1;
    }
    const rabinDuration = performance.now() - rabinStart;
    const rabinThroughput = bytes / (rabinDuration / 1000) / (1024 * 1024);

    results.push({
      strategy: "Content-Defined",
      fileSize: label,
      throughputMBps: Math.round(rabinThroughput),
      durationMs: Math.round(rabinDuration),
      chunksProduced: rabinChunks,
    });
  }

  return results;
}

async function benchmarkBloomFilter(): Promise<BloomFilterBenchmarkResult[]> {
  const results: BloomFilterBenchmarkResult[] = [];
  const itemCounts = [1000, 10_000, 100_000, 1_000_000];

  for (const itemCount of itemCounts) {
    const filter = new BloomFilter({
      size: BloomFilter.optimalSize(itemCount, 0.01),
      falsePositiveRate: 0.01,
    });

    const insertStart = performance.now();
    for (let i = 0; i < itemCount; i++) {
      await filter.add(`item-${i}`);
    }
    const insertDuration = performance.now() - insertStart;
    const insertThroughput = itemCount / (insertDuration / 1000);

    results.push({
      operation: "Insert",
      itemCount,
      throughputOpsPerSec: Math.round(insertThroughput),
      durationMs: Math.round(insertDuration),
      memoryUsageBytes: filter.getMemoryUsage(),
    });

    const queryStart = performance.now();
    const queryCount = 10_000;
    for (let i = 0; i < queryCount; i++) {
      await filter.has(`item-${i % itemCount}`);
    }
    const queryDuration = performance.now() - queryStart;
    const queryThroughput = queryCount / (queryDuration / 1000);

    results.push({
      operation: "Query",
      itemCount,
      throughputOpsPerSec: Math.round(queryThroughput),
      durationMs: Math.round(queryDuration),
      memoryUsageBytes: filter.getMemoryUsage(),
    });

    let falsePositives = 0;
    const testCount = 10_000;
    for (let i = 0; i < testCount; i++) {
      const exists = await filter.has(`absent-${i}`);
      if (exists) {
        falsePositives += 1;
      }
    }
    const actualFPR = falsePositives / testCount;

    results.push({
      operation: "False Positive Rate",
      itemCount,
      throughputOpsPerSec: 0,
      durationMs: 0,
      memoryUsageBytes: filter.getMemoryUsage(),
      falsePositiveRate: actualFPR,
    });
  }

  return results;
}

async function benchmarkDeduplication(): Promise<
  DeduplicationBenchmarkResult[]
> {
  const results: DeduplicationBenchmarkResult[] = [];
  const documentCounts = [100, 1000, 10_000];

  for (const documentCount of documentCounts) {
    const documents = Array.from({ length: documentCount }, (_, i) => ({
      title: `Document ${i}`,
      content: `Content for document ${i}`,
      metadata: { id: i },
    }));

    const dbOnlyStart = performance.now();
    const dbChecksums = new Set<string>();
    for (const doc of documents) {
      const checksum = await calculateDocumentChecksum(doc);
      dbChecksums.add(checksum);
    }
    const dbOnlyDuration = performance.now() - dbOnlyStart;
    const dbOnlyThroughput = (documentCount / (dbOnlyDuration / 1000)) * 60;

    results.push({
      strategy: "Database-Only",
      documentCount,
      throughputDocsPerMin: Math.round(dbOnlyThroughput),
      durationMs: Math.round(dbOnlyDuration),
    });

    const bloomFilter = new BloomFilter({
      size: BloomFilter.optimalSize(documentCount, 0.01),
      falsePositiveRate: 0.01,
    });

    const bloomStart = performance.now();
    for (const doc of documents) {
      const checksum = await calculateDocumentChecksum(doc);
      const exists = await bloomFilter.has(checksum);
      if (!exists) {
        await bloomFilter.add(checksum);
      }
    }
    const bloomDuration = performance.now() - bloomStart;
    const bloomThroughput = (documentCount / (bloomDuration / 1000)) * 60;
    const speedupFactor = dbOnlyDuration / bloomDuration;

    results.push({
      strategy: "Bloom Filter",
      documentCount,
      throughputDocsPerMin: Math.round(bloomThroughput),
      durationMs: Math.round(bloomDuration),
      speedupFactor: Math.round(speedupFactor * 100) / 100,
    });
  }

  return results;
}

describe.skip("Performance Benchmarks", () => {
  it("hash performance", async () => {
    const results = await benchmarkHashing();
    console.table(results);

    const blake3_100MB = results.find(
      (r) => r.algorithm === "BLAKE3" && r.size === "100MB"
    );
    const sha256_100MB = results.find(
      (r) => r.algorithm === "SHA-256" && r.size === "100MB"
    );

    expect(blake3_100MB).toBeDefined();
    expect(sha256_100MB).toBeDefined();
    expect(blake3_100MB!.throughputMBps).toBeGreaterThan(
      sha256_100MB!.throughputMBps * 1.5
    );
  });

  it("chunking performance", async () => {
    const results = await benchmarkChunking();
    console.table(results);

    const fixed100MB = results.find(
      (r) => r.strategy === "Fixed-Size" && r.fileSize === "100MB"
    );
    const rabin100MB = results.find(
      (r) => r.strategy === "Content-Defined" && r.fileSize === "100MB"
    );

    expect(fixed100MB).toBeDefined();
    expect(rabin100MB).toBeDefined();
    expect(fixed100MB!.throughputMBps).toBeGreaterThan(
      rabin100MB!.throughputMBps
    );
  });

  it("bloom filter performance", async () => {
    const results = await benchmarkBloomFilter();
    console.table(results);

    const insert1M = results.find(
      (r) => r.operation === "Insert" && r.itemCount === 1_000_000
    );
    const query1M = results.find(
      (r) => r.operation === "Query" && r.itemCount === 1_000_000
    );
    const fpr1M = results.find(
      (r) => r.operation === "False Positive Rate" && r.itemCount === 1_000_000
    );

    expect(insert1M).toBeDefined();
    expect(query1M).toBeDefined();
    expect(fpr1M).toBeDefined();
    expect(insert1M!.throughputOpsPerSec).toBeGreaterThan(10_000);
    expect(query1M!.throughputOpsPerSec).toBeGreaterThan(100_000);
    expect(fpr1M!.falsePositiveRate).toBeLessThan(0.02);
  });

  it("end-to-end deduplication", async () => {
    const results = await benchmarkDeduplication();
    console.table(results);

    const dbOnly10k = results.find(
      (r) => r.strategy === "Database-Only" && r.documentCount === 10_000
    );
    const bloom10k = results.find(
      (r) => r.strategy === "Bloom Filter" && r.documentCount === 10_000
    );

    expect(dbOnly10k).toBeDefined();
    expect(bloom10k).toBeDefined();
    expect(bloom10k!.speedupFactor).toBeDefined();
    expect(bloom10k!.speedupFactor!).toBeGreaterThan(1);
    expect(bloom10k!.throughputDocsPerMin).toBeGreaterThan(
      dbOnly10k!.throughputDocsPerMin
    );
  });
});
