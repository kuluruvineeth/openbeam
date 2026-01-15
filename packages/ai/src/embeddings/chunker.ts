import type { ChunkingConfig, TextChunk } from "@openplane/types/ai";

const SENTENCE_REGEX = /[^.!?]+[.!?]+\s*/g;
const PARAGRAPH_REGEX = /\n\s*\n/;

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  strategy: "recursive",
  maxChunkSize: 1500,
  minChunkSize: 100,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""],
  preserveParagraphs: true,
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class DocumentChunker {
  private config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  }

  chunk(text: string, documentId = "doc"): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleanedText = this.cleanText(text);

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
          tokenCount: estimateTokens(chunkText),
        });
        index += 1;
      }

      startOffset = endOffset - chunkOverlap;
      if (startOffset <= 0 || startOffset >= text.length) {
        break;
      }
    }

    return chunks;
  }

  private sentenceChunk(text: string, documentId: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, minChunkSize } = this.config;

    // Split into sentences
    const sentences = text.match(SENTENCE_REGEX) ?? [text];

    let currentChunk = "";
    let currentStartOffset = 0;
    let offset = 0;
    let index = 0;

    for (const sentence of sentences) {
      if (
        currentChunk.length + sentence.length > maxChunkSize &&
        currentChunk.length >= minChunkSize
      ) {
        chunks.push({
          id: `${documentId}-chunk-${index}`,
          text: currentChunk.trim(),
          index,
          startOffset: currentStartOffset,
          endOffset: offset,
          tokenCount: estimateTokens(currentChunk),
        });
        index += 1;
        currentChunk = "";
        currentStartOffset = offset;
      }

      currentChunk += sentence;
      offset += sentence.length;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${index}`,
        text: currentChunk.trim(),
        index,
        startOffset: currentStartOffset,
        endOffset: text.length,
        tokenCount: estimateTokens(currentChunk),
      });
    }

    return chunks;
  }

  private paragraphChunk(text: string, documentId: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const { maxChunkSize, minChunkSize } = this.config;

    const paragraphs = text.split(PARAGRAPH_REGEX);

    let currentChunk = "";
    let currentStartOffset = 0;
    let offset = 0;
    let index = 0;

    for (const paragraph of paragraphs) {
      const paragraphWithBreak = `${paragraph}\n\n`;

      if (paragraph.length > maxChunkSize) {
        if (currentChunk.trim().length >= minChunkSize) {
          chunks.push({
            id: `${documentId}-chunk-${index}`,
            text: currentChunk.trim(),
            index,
            startOffset: currentStartOffset,
            endOffset: offset,
            tokenCount: estimateTokens(currentChunk),
          });
          index += 1;
          currentChunk = "";
          currentStartOffset = offset;
        }

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
          index += 1;
        }

        currentStartOffset = offset + paragraph.length;
        offset += paragraphWithBreak.length;
        continue;
      }

      if (
        currentChunk.length + paragraphWithBreak.length > maxChunkSize &&
        currentChunk.length >= minChunkSize
      ) {
        chunks.push({
          id: `${documentId}-chunk-${index}`,
          text: currentChunk.trim(),
          index,
          startOffset: currentStartOffset,
          endOffset: offset,
          tokenCount: estimateTokens(currentChunk),
        });
        index += 1;
        currentChunk = "";
        currentStartOffset = offset;
      }

      currentChunk += paragraphWithBreak;
      offset += paragraphWithBreak.length;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${index}`,
        text: currentChunk.trim(),
        index,
        startOffset: currentStartOffset,
        endOffset: text.length,
        tokenCount: estimateTokens(currentChunk),
      });
    }

    return chunks;
  }

  private recursiveChunk(text: string, documentId: string): TextChunk[] {
    const chunks = this.recursiveSplit(text, this.config.separators);

    return chunks.map((chunk, index) => ({
      id: `${documentId}-chunk-${index}`,
      text: chunk.text,
      index,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      tokenCount: estimateTokens(chunk.text),
    }));
  }

  // biome-ignore lint/complexity: Recursive text splitting algorithm is inherently complex
  private recursiveSplit(
    text: string,
    separators: string[],
    startOffset = 0
  ): Array<{ text: string; startOffset: number; endOffset: number }> {
    const { maxChunkSize, chunkOverlap, minChunkSize } = this.config;

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

    let separator = "";
    for (const sep of separators) {
      if (text.includes(sep)) {
        separator = sep;
        break;
      }
    }

    const splits = separator === "" ? [text] : text.split(separator);
    const chunks: Array<{
      text: string;
      startOffset: number;
      endOffset: number;
    }> = [];

    let currentChunk = "";
    let currentStartOffset = startOffset;
    let offset = startOffset;

    for (let i = 0; i < splits.length; i += 1) {
      const split = splits[i] ?? "";
      const splitWithSep =
        i < splits.length - 1 ? `${split}${separator}` : split;

      if (
        currentChunk.length + splitWithSep.length > maxChunkSize &&
        currentChunk.length >= minChunkSize
      ) {
        if (currentChunk.trim().length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            startOffset: currentStartOffset,
            endOffset: offset,
          });
        }

        if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
          const overlapText = currentChunk.slice(-chunkOverlap);
          currentChunk = `${overlapText}${splitWithSep}`;
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

    if (currentChunk.trim().length > 0) {
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

  private cleanText(text: string): string {
    return (
      text
        // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally removing control chars
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  setConfig(config: Partial<ChunkingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ChunkingConfig {
    return { ...this.config };
  }
}

export function chunkDocument(
  text: string,
  documentId = "doc",
  config: Partial<ChunkingConfig> = {}
): TextChunk[] {
  const chunker = new DocumentChunker(config);
  return chunker.chunk(text, documentId);
}
