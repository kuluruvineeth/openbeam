import type { EdgeEmbeddingModel } from "@openplane/types/edge/ai";

export class MockEmbeddingModel implements EdgeEmbeddingModel {
  private _dimensions: number;
  private _modelId: string;
  private available = true;

  constructor(options?: { dimensions?: number; modelId?: string }) {
    this._dimensions = options?.dimensions ?? 384;
    this._modelId = options?.modelId ?? "mock-embedding";
  }

  async embed(text: string): Promise<Float32Array> {
    return this.hashToVector(text);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  dimensions(): number {
    return this._dimensions;
  }

  modelId(): string {
    return this._modelId;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  private hashToVector(text: string): Float32Array {
    const vector = new Float32Array(this._dimensions);
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    for (let i = 0; i < this._dimensions; i += 1) {
      hash = ((hash << 13) ^ hash) - (hash >>> 7);
      vector[i] = ((hash & 0xffff) / 0xffff) * 2 - 1;
    }
    let norm = 0;
    for (let i = 0; i < this._dimensions; i += 1) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this._dimensions; i += 1) {
        vector[i] /= norm;
      }
    }
    return vector;
  }
}
