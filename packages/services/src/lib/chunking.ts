import { createBLAKE3 } from "hash-wasm";

const RABIN_POLYNOMIAL = 0x3d_a3_35_8b_4d_c1_73n;
const WINDOW_SIZE = 64;
const MIN_CHUNK_SIZE = 2 * 1024 * 1024;
const AVG_CHUNK_SIZE = 4 * 1024 * 1024;
const MAX_CHUNK_SIZE = 8 * 1024 * 1024;

export interface ChunkingOptions {
  minChunkSize?: number;
  avgChunkSize?: number;
  maxChunkSize?: number;
}

export interface Chunk {
  data: Uint8Array;
  offset: number;
  length: number;
  hash: string;
}

class RabinFingerprint {
  private readonly polynomial: bigint;
  private readonly window: number[];
  private readonly windowSize: number;
  private fingerprint: bigint;

  constructor(
    polynomial: bigint = RABIN_POLYNOMIAL,
    windowSize: number = WINDOW_SIZE
  ) {
    this.polynomial = polynomial;
    this.window = new Array(windowSize).fill(0);
    this.windowSize = windowSize;
    this.fingerprint = BigInt(0);
  }

  roll(byte: number): bigint {
    const outByte = this.window.shift()!;
    this.window.push(byte);

    this.fingerprint <<= BigInt(8);
    this.fingerprint ^= BigInt(byte);
    this.fingerprint ^= BigInt(outByte) << BigInt(this.windowSize * 8);
    this.fingerprint = this.mod(this.fingerprint);

    return this.fingerprint;
  }

  private mod(value: bigint): bigint {
    return value % this.polynomial;
  }

  reset(): void {
    this.window.fill(0);
    this.fingerprint = BigInt(0);
  }
}

export class RabinChunker {
  private readonly minSize: number;
  private readonly avgSize: number;
  private readonly maxSize: number;
  private readonly mask: bigint;

  constructor(options: ChunkingOptions = {}) {
    this.minSize = options.minChunkSize ?? MIN_CHUNK_SIZE;
    this.avgSize = options.avgChunkSize ?? AVG_CHUNK_SIZE;
    this.maxSize = options.maxChunkSize ?? MAX_CHUNK_SIZE;
    this.mask = BigInt((1 << Math.log2(this.avgSize)) - 1);
  }

  async *chunk(data: Uint8Array): AsyncGenerator<Chunk> {
    const fingerprint = new RabinFingerprint();
    const hasher = await createBLAKE3();

    let chunkStart = 0;
    let offset = 0;

    for (let i = 0; i < data.length; i++) {
      const fp = fingerprint.roll(data[i] ?? 0);
      const chunkSize = i - chunkStart;

      const isBoundary = (fp & this.mask) === BigInt(0);
      const isMinSize = chunkSize >= this.minSize;
      const isMaxSize = chunkSize >= this.maxSize;

      if ((isBoundary && isMinSize) || isMaxSize) {
        const chunkData = data.slice(chunkStart, i + 1);

        hasher.init();
        hasher.update(chunkData);
        const hash = hasher.digest("hex");

        yield {
          data: chunkData,
          offset,
          length: chunkData.length,
          hash,
        };

        chunkStart = i + 1;
        offset += chunkData.length;
        fingerprint.reset();
      }
    }

    if (chunkStart < data.length) {
      const chunkData = data.slice(chunkStart);

      hasher.init();
      hasher.update(chunkData);
      const hash = hasher.digest("hex");

      yield {
        data: chunkData,
        offset,
        length: chunkData.length,
        hash,
      };
    }
  }
}

export async function calculateLargeFileChecksum(
  data: Uint8Array,
  options: { threshold?: number } = {}
): Promise<string> {
  const threshold = options.threshold ?? 10 * 1024 * 1024;

  if (data.length < threshold) {
    const hasher = await createBLAKE3();
    hasher.init();
    hasher.update(data);
    return hasher.digest("hex");
  }

  const chunker = new RabinChunker();
  const chunkHashes: string[] = [];

  for await (const chunk of chunker.chunk(data)) {
    chunkHashes.push(chunk.hash);
  }

  const hasher = await createBLAKE3();
  hasher.init();
  hasher.update(chunkHashes.join(""));
  return hasher.digest("hex");
}
