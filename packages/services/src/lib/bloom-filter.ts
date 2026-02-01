import { createBLAKE3 } from "hash-wasm";

export interface BloomFilterConfig {
  size: number;
  falsePositiveRate?: number;
  hashFunctions?: number;
}

export class BloomFilter {
  private readonly bitArray: Uint8Array;
  private readonly size: number;
  private readonly hashCount: number;

  constructor(config: BloomFilterConfig, providedBitArray?: Uint8Array) {
    this.size = config.size;
    this.hashCount =
      config.hashFunctions ??
      this.optimalHashCount(config.falsePositiveRate ?? 0.01);
    this.bitArray =
      providedBitArray ?? new Uint8Array(Math.ceil(this.size / 8));
  }

  private optimalHashCount(falsePositiveRate: number): number {
    return Math.ceil(-Math.log2(falsePositiveRate));
  }

  static optimalSize(expectedItems: number, falsePositiveRate: number): number {
    return Math.ceil(
      -(expectedItems * Math.log(falsePositiveRate)) / Math.log(2) ** 2
    );
  }

  async add(item: string): Promise<void> {
    const indices = await this.getIndices(item);
    for (const index of indices) {
      this.setBit(index);
    }
  }

  async has(item: string): Promise<boolean> {
    const indices = await this.getIndices(item);
    return indices.every((index) => this.getBit(index));
  }

  private async getIndices(item: string): Promise<number[]> {
    const hasher = await createBLAKE3();
    const indices: number[] = [];

    for (let i = 0; i < this.hashCount; i++) {
      hasher.init();
      hasher.update(`${item}:${i}`);
      const hash = hasher.digest("hex");
      const hashValue = BigInt(`0x${hash.slice(0, 16)}`);
      const index = Number(hashValue % BigInt(this.size));
      indices.push(index);
    }

    return indices;
  }

  private setBit(index: number): void {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    this.bitArray[byteIndex]! |= 1 << bitIndex;
  }

  private getBit(index: number): boolean {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    return (this.bitArray[byteIndex]! & (1 << bitIndex)) !== 0;
  }

  clear(): void {
    this.bitArray.fill(0);
  }

  getMemoryUsage(): number {
    return this.bitArray.byteLength;
  }

  getOccupancy(): number {
    let setBits = 0;
    for (let i = 0; i < this.size; i++) {
      if (this.getBit(i)) {
        setBits += 1;
      }
    }
    return setBits / this.size;
  }

  serialize(): string {
    return Buffer.from(this.bitArray).toString("base64");
  }

  static deserialize(data: string, config: BloomFilterConfig): BloomFilter {
    const bitArray = new Uint8Array(Buffer.from(data, "base64"));
    return new BloomFilter(config, bitArray);
  }
}

export class ScalableBloomFilter {
  private filters: BloomFilter[];
  private readonly itemsPerFilter: number;
  private readonly falsePositiveRate: number;
  private currentItems: number;

  constructor(initialSize = 1_000_000, falsePositiveRate = 0.01) {
    this.itemsPerFilter = initialSize;
    this.falsePositiveRate = falsePositiveRate;
    this.currentItems = 0;
    this.filters = [this.createFilter()];
  }

  private createFilter(): BloomFilter {
    const size = BloomFilter.optimalSize(
      this.itemsPerFilter,
      this.falsePositiveRate
    );
    return new BloomFilter({ size, falsePositiveRate: this.falsePositiveRate });
  }

  async add(item: string): Promise<void> {
    const currentFilter = this.filters.at(-1);
    if (!currentFilter) {
      throw new Error("No filters available");
    }
    await currentFilter.add(item);
    this.currentItems += 1;

    if (this.currentItems % this.itemsPerFilter === 0) {
      this.filters.push(this.createFilter());
    }
  }

  async has(item: string): Promise<boolean> {
    for (const filter of this.filters) {
      if (await filter.has(item)) {
        return true;
      }
    }
    return false;
  }

  clear(): void {
    this.filters = [this.createFilter()];
    this.currentItems = 0;
  }

  getMemoryUsage(): number {
    return this.filters.reduce(
      (sum, filter) => sum + filter.getMemoryUsage(),
      0
    );
  }

  getFilterCount(): number {
    return this.filters.length;
  }
}
