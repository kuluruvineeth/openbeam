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
  const itemCounts = [1000, 10_000, 100_000];

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

async function main() {
  console.log("\n=== Hash Performance Benchmark ===\n");
  const hashResults = await benchmarkHashing();
  console.table(hashResults);

  console.log("\n=== Chunking Performance Benchmark ===\n");
  const chunkingResults = await benchmarkChunking();
  console.table(chunkingResults);

  console.log("\n=== Bloom Filter Performance Benchmark ===\n");
  const bloomResults = await benchmarkBloomFilter();
  console.table(bloomResults);

  console.log("\n=== End-to-End Deduplication Benchmark ===\n");
  const dedupResults = await benchmarkDeduplication();
  console.table(dedupResults);
}

main();
