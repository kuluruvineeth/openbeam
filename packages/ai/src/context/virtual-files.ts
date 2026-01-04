import { estimateTokenCount } from "./estimator";

export interface VirtualFile {
  id: string;
  name: string;
  content: string;
  mimeType: string;
  tokenCount: number;
  createdAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

export interface VirtualFileReference {
  fileId: string;
  name: string;
  preview: string;
  tokenCount: number;
}

export interface VirtualFileStoreOptions {
  maxFiles?: number;
  maxTotalTokens?: number;
  previewLength?: number;
}

const DEFAULT_MAX_FILES = 50;
const DEFAULT_MAX_TOTAL_TOKENS = 500_000;
const DEFAULT_PREVIEW_LENGTH = 200;

export class VirtualFileStore {
  private readonly files = new Map<string, VirtualFile>();
  private readonly maxFiles: number;
  private readonly maxTotalTokens: number;
  private readonly previewLength: number;
  private fileCounter = 0;

  constructor(options: VirtualFileStoreOptions = {}) {
    this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    this.maxTotalTokens = options.maxTotalTokens ?? DEFAULT_MAX_TOTAL_TOKENS;
    this.previewLength = options.previewLength ?? DEFAULT_PREVIEW_LENGTH;
  }

  store(
    name: string,
    content: string,
    mimeType = "text/plain"
  ): VirtualFileReference {
    this.fileCounter += 1;
    const id = `vf_${this.fileCounter}_${Date.now()}`;
    const tokenCount = estimateTokenCount(content);

    const file: VirtualFile = {
      id,
      name,
      content,
      mimeType,
      tokenCount,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessedAt: Date.now(),
    };

    this.evictIfNeeded(tokenCount);
    this.files.set(id, file);

    return this.createReference(file);
  }

  retrieve(fileId: string): string | null {
    const file = this.files.get(fileId);
    if (!file) {
      return null;
    }

    file.accessCount += 1;
    file.lastAccessedAt = Date.now();
    return file.content;
  }

  retrieveChunk(fileId: string, start: number, end: number): string | null {
    const content = this.retrieve(fileId);
    if (!content) {
      return null;
    }
    return content.slice(start, end);
  }

  getReference(fileId: string): VirtualFileReference | null {
    const file = this.files.get(fileId);
    if (!file) {
      return null;
    }
    return this.createReference(file);
  }

  listReferences(): VirtualFileReference[] {
    return Array.from(this.files.values()).map((f) => this.createReference(f));
  }

  delete(fileId: string): boolean {
    return this.files.delete(fileId);
  }

  clear(): void {
    this.files.clear();
  }

  getTotalTokens(): number {
    let total = 0;
    for (const file of this.files.values()) {
      total += file.tokenCount;
    }
    return total;
  }

  getFileCount(): number {
    return this.files.size;
  }

  private createReference(file: VirtualFile): VirtualFileReference {
    const preview = this.generatePreview(file.content);
    return {
      fileId: file.id,
      name: file.name,
      preview,
      tokenCount: file.tokenCount,
    };
  }

  private generatePreview(content: string): string {
    const cleaned = content.replace(/\s+/g, " ").trim();
    if (cleaned.length <= this.previewLength) {
      return cleaned;
    }
    return `${cleaned.slice(0, this.previewLength)}...`;
  }

  private evictIfNeeded(newTokens: number): void {
    while (this.files.size >= this.maxFiles) {
      this.evictLeastRecentlyUsed();
    }

    while (this.getTotalTokens() + newTokens > this.maxTotalTokens) {
      if (!this.evictLeastRecentlyUsed()) {
        break;
      }
    }
  }

  private evictLeastRecentlyUsed(): boolean {
    if (this.files.size === 0) {
      return false;
    }

    let oldest: VirtualFile | null = null;
    for (const file of this.files.values()) {
      if (!oldest || file.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = file;
      }
    }

    if (oldest) {
      this.files.delete(oldest.id);
      return true;
    }
    return false;
  }
}

export function createVirtualFileStore(
  options?: VirtualFileStoreOptions
): VirtualFileStore {
  return new VirtualFileStore(options);
}

export function shouldStoreAsVirtualFile(
  content: string,
  threshold = 2000
): boolean {
  return estimateTokenCount(content) > threshold;
}
