/**
 * Document Chunker
 *
 * Splits documents into chunks suitable for embedding.
 * Supports multiple chunking strategies optimized for RAG.
 */

import type { ChunkingConfig, TextChunk } from "./types";

/**
 * Default chunking configuration
 * Optimized for text-embedding-3-small with 8191 token limit
 */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  strategy: "recursive",
  maxChunkSize: 1500, // ~375 tokens, leaving room for context
  minChunkSize: 100,
  chunkOverlap: 200, // ~50 tokens overlap for context continuity
  separators: ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
  preserveParagraphs: true,
};

/**
 * Document Chunker class
 */
export class DocumentChunker {
  private config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  }

  /**
   * Chunk a document using the configured strategy
   */
  chunk(text: string, documentId = "doc"): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Clean the text
    const cleanedText = this.cleanText(text);

    // Apply chunking strategy
    switch (this.config.strategy) {
      case "fixed":
        return this.fixedChunk(cleanedText, documentId);
      case "sentence":
        return this.sentenceChunk(cleanedText, documentId);
      case "paragraph":
        return this.paragraphChunk(cleanedText, documentId);
      case "recursive":
        return this.recursiveChunk(cleanedText, documentId);
      default:
        return this.recursiveChunk(cleanedText, documentId);
    }
  }

  /**
   * Fixed-size chunking
   */
  private fixedChunk(text: string, documentId: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, chunkOverlap } = this.config;

    let startOffset = 0;
    let index = 0;

    while (startOffset < text.length) {
      const endOffset = Math.min(startOffset + maxChunkSize, text.length);
      const chunkText = text.slice(startOffset, endOffset);

      if (chunkText.trim().length > 0) {
        chunks.push({
          id: `${documentId}-chunk-${index}`,
          text: chunkText.trim(),
          index,
          startOffset,
          endOffset,
        });
        index++;
      }

      startOffset = endOffset - chunkOverlap;
      if (startOffset < 0) startOffset = endOffset;
    }

    return chunks;
  }

  /**
   * Sentence-based chunking
   */
  private sentenceChunk(text: string, documentId: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, minChunkSize } = this.config;

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];

    let currentChunk = "";
    let startOffset = 0;
    let currentStartOffset = 0;
    let index = 0;

    for (const sentence of sentences) {
      // If adding this sentence would exceed max size, save current chunk
      if (
        currentChunk.length + sentence.length > maxChunkSize &&
        currentChunk.length >= (minChunkSize || 0)
      ) {
        chunks.push({
          id: `${documentId}-chunk-${index}`,
          text: currentChunk.trim(),
          index,
          startOffset: currentStartOffset,
          endOffset: startOffset,
        });
        index++;
        currentChunk = "";
        currentStartOffset = startOffset;
      }

      currentChunk += sentence;
      startOffset += sentence.length;
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${index}`,
        text: currentChunk.trim(),
        index,
        startOffset: currentStartOffset,
        endOffset: text.length,
      });
    }

    return chunks;
  }

  /**
   * Paragraph-based chunking
   */
  private paragraphChunk(text: string, documentId: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, minChunkSize } = this.config;

    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);

    let currentChunk = "";
    const startOffset = 0;
    let currentStartOffset = 0;
    let index = 0;
    let offset = 0;

    for (const paragraph of paragraphs) {
      const paragraphWithBreak = paragraph + "\n\n";

      // If single paragraph exceeds max, use sentence chunking for it
      if (paragraph.length > maxChunkSize) {
        // Save current chunk first
        if (currentChunk.trim().length >= (minChunkSize || 0)) {
          chunks.push({
            id: `${documentId}-chunk-${index}`,
            text: currentChunk.trim(),
            index,
            startOffset: currentStartOffset,
            endOffset: offset,
          });
          index++;
          currentChunk = "";
          currentStartOffset = offset;
        }

        // Chunk the long paragraph
        const subChunks = this.sentenceChunk(
          paragraph,
          `${documentId}-p${index}`
        );
        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            id: `${documentId}-chunk-${index}`,
            index,
            startOffset: offset + subChunk.startOffset,
            endOffset: offset + subChunk.endOffset,
          });
          index++;
        }

        currentStartOffset = offset + paragraph.length;
        offset += paragraphWithBreak.length;
        continue;
      }

      // If adding this paragraph would exceed max size, save current chunk
      if (
        currentChunk.length + paragraphWithBreak.length > maxChunkSize &&
        currentChunk.length >= (minChunkSize || 0)
      ) {
        chunks.push({
          id: `${documentId}-chunk-${index}`,
          text: currentChunk.trim(),
          index,
          startOffset: currentStartOffset,
          endOffset: offset,
        });
        index++;
        currentChunk = "";
        currentStartOffset = offset;
      }

      currentChunk += paragraphWithBreak;
      offset += paragraphWithBreak.length;
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${index}`,
        text: currentChunk.trim(),
        index,
        startOffset: currentStartOffset,
        endOffset: text.length,
      });
    }

    return chunks;
  }

  /**
   * Recursive character text splitter (LangChain-style)
   * Most reliable for mixed content types
   */
  private recursiveChunk(text: string, documentId: string): TextChunk[] {
    const { separators = DEFAULT_CHUNKING_CONFIG.separators! } = this.config;

    const chunks = this.recursiveSplit(text, separators);

    return chunks.map((chunk, index) => ({
      id: `${documentId}-chunk-${index}`,
      text: chunk.text,
      index,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
    }));
  }

  /**
   * Recursive split helper
   */
  private recursiveSplit(
    text: string,
    separators: string[],
    startOffset = 0
  ): Array<{ text: string; startOffset: number; endOffset: number }> {
    const { maxChunkSize, chunkOverlap, minChunkSize = 0 } = this.config;

    // Base case: text is small enough
    if (text.length <= maxChunkSize) {
      return text.trim().length > 0
        ? [
            {
              text: text.trim(),
              startOffset,
              endOffset: startOffset + text.length,
            },
          ]
        : [];
    }

    // Find the best separator
    let separator = "";
    for (const sep of separators) {
      if (text.includes(sep)) {
        separator = sep;
        break;
      }
    }

    // Split by separator
    const splits = separator === "" ? [text] : text.split(separator);

    // Merge splits into chunks
    const chunks: Array<{
      text: string;
      startOffset: number;
      endOffset: number;
    }> = [];
    let currentChunk = "";
    let currentStartOffset = startOffset;
    let offset = startOffset;

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitWithSep = i < splits.length - 1 ? split + separator : split;

      if (
        currentChunk.length + splitWithSep.length > maxChunkSize &&
        currentChunk.length >= minChunkSize
      ) {
        // Current chunk is full, save it
        if (currentChunk.trim().length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            startOffset: currentStartOffset,
            endOffset: offset,
          });
        }

        // Start new chunk with overlap
        if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
          const overlapText = currentChunk.slice(-chunkOverlap);
          currentChunk = overlapText + splitWithSep;
          currentStartOffset = offset - chunkOverlap;
        } else {
          currentChunk = splitWithSep;
          currentStartOffset = offset;
        }
      } else {
        currentChunk += splitWithSep;
      }

      offset += splitWithSep.length;
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      // If still too large, recurse with next separator
      if (currentChunk.length > maxChunkSize && separators.length > 1) {
        const subChunks = this.recursiveSplit(
          currentChunk,
          separators.slice(1),
          currentStartOffset
        );
        chunks.push(...subChunks);
      } else {
        chunks.push({
          text: currentChunk.trim(),
          startOffset: currentStartOffset,
          endOffset: startOffset + text.length,
        });
      }
    }

    return chunks;
  }

  /**
   * Clean text by normalizing whitespace and removing control characters
   */
  private cleanText(text: string): string {
    return (
      text
        // Remove null bytes and control characters
        // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally removing control chars
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        // Normalize whitespace
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Remove excessive blank lines
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 chars for English)
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Create a chunker with specific config
   */
  static create(config: Partial<ChunkingConfig> = {}): DocumentChunker {
    return new DocumentChunker(config);
  }
}

/**
 * Convenience function for one-off chunking
 */
export function chunkDocument(
  text: string,
  documentId = "doc",
  config: Partial<ChunkingConfig> = {}
): TextChunk[] {
  const chunker = new DocumentChunker(config);
  return chunker.chunk(text, documentId);
}

export default DocumentChunker;
