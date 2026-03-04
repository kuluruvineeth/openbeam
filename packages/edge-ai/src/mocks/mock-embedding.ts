import type { EdgeEmbeddingModel } from "@openplane/types/edge/ai";

export class MockEmbeddingModel implements EdgeEmbeddingModel {
  private readonly _dimensions: number;
  private readonly _modelId: string;
  private available = true;

  constructor(options?: { dimensions?: number; modelId?: string }) {
    this._dimensions = options?.dimensions ?? 384;
    this._modelId = options?.modelId ?? "mock-embedding";
  }

  embed(text: string): Promise<Float32Array> {
    return Promise.resolve(hashToVector(text, this._dimensions));
  }

  embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  dimensions(): number {
    return this._dimensions;
  }

  modelId(): string {
    return this._modelId;
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }
}

function hashToVector(text: string, dimensions: number): Float32Array {
  const vector = new Float32Array(dimensions);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    // biome-ignore lint/suspicious/noBitwiseOperators: deterministic hash
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < dimensions; i += 1) {
    // biome-ignore lint/suspicious/noBitwiseOperators: deterministic hash
    hash = ((hash << 13) ^ hash) - (hash >>> 7);
    // biome-ignore lint/suspicious/noBitwiseOperators: extract lower 16 bits
    vector[i] = ((hash & 0xff_ff) / 0xff_ff) * 2 - 1;
  }
  let norm = 0;
  for (let i = 0; i < dimensions; i += 1) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i += 1) {
      vector[i] /= norm;
    }
  }
  return vector;
}
