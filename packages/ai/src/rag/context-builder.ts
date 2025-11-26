/**
 * Context Builder
 *
 * Builds context for RAG from retrieved documents.
 * Handles token limits, truncation, and formatting.
 */

import { getConfig } from "../config";
import { DocumentChunker } from "../embeddings/chunker";
import type {
  BuiltContext,
  ContextWindowConfig,
  RetrievedDocument,
} from "./types";

/**
 * Default context window configuration
 */
const DEFAULT_CONTEXT_CONFIG: ContextWindowConfig = {
  maxTokens: 8000,
  reservedForOutput: 2000,
  reservedForPrompt: 500,
  documentSeparator: "\n\n---\n\n",
  truncationStrategy: "smart",
};

/**
 * Context Builder class
 */
export class ContextBuilder {
  private config: ContextWindowConfig;

  constructor(config: Partial<ContextWindowConfig> = {}) {
    const aiConfig = getConfig();
    this.config = {
      ...DEFAULT_CONTEXT_CONFIG,
      maxTokens: aiConfig.rag.maxContextTokens,
      reservedForOutput: aiConfig.rag.reservedOutputTokens,
      ...config,
    };
  }

  /**
   * Build context from retrieved documents
   */
  build(documents: RetrievedDocument[]): BuiltContext {
    if (documents.length === 0) {
      return {
        prompt: "No relevant documents found.",
        documents: [],
        tokenCount: 0,
        truncated: false,
      };
    }

    const availableTokens =
      this.config.maxTokens -
      this.config.reservedForOutput -
      this.config.reservedForPrompt;

    const includedDocs: RetrievedDocument[] = [];
    const docContents: string[] = [];
    let currentTokens = 0;
    let truncated = false;

    // Sort by relevance score (highest first)
    const sortedDocs = [...documents].sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );

    for (const doc of sortedDocs) {
      const docContent = this.formatDocument(doc);
      const docTokens = DocumentChunker.estimateTokens(docContent);

      // Check if we have room for this document
      if (currentTokens + docTokens <= availableTokens) {
        includedDocs.push(doc);
        docContents.push(docContent);
        currentTokens += docTokens;
      } else if (this.config.truncationStrategy === "smart") {
        // Try to fit a truncated version
        const remainingTokens = availableTokens - currentTokens;
        if (remainingTokens > 200) {
          // At least 200 tokens for a meaningful excerpt
          const truncatedContent = this.truncateDocument(doc, remainingTokens);
          includedDocs.push(doc);
          docContents.push(truncatedContent);
          currentTokens += DocumentChunker.estimateTokens(truncatedContent);
          truncated = true;
        }
        break; // No more room
      } else {
        truncated = true;
        break;
      }
    }

    const prompt = docContents.join(this.config.documentSeparator);

    return {
      prompt,
      documents: includedDocs,
      tokenCount: currentTokens,
      truncated,
    };
  }

  /**
   * Format a document for context inclusion
   */
  private formatDocument(doc: RetrievedDocument): string {
    const parts: string[] = [];

    // Header with title and source
    parts.push(`[${doc.title}]`);

    // Metadata line
    const meta: string[] = [];
    if (doc.connectorType) meta.push(`Source: ${doc.connectorType}`);
    if (doc.authorName) meta.push(`Author: ${doc.authorName}`);
    if (doc.updatedAt) {
      const date = new Date(doc.updatedAt);
      meta.push(`Updated: ${date.toLocaleDateString()}`);
    }
    if (meta.length > 0) {
      parts.push(meta.join(" | "));
    }

    // URL if available
    if (doc.url) {
      parts.push(`URL: ${doc.url}`);
    }

    // Content
    parts.push("");
    parts.push(doc.content);

    return parts.join("\n");
  }

  /**
   * Truncate a document to fit within token limit
   */
  private truncateDocument(doc: RetrievedDocument, maxTokens: number): string {
    const header = `[${doc.title}]`;
    const headerTokens = DocumentChunker.estimateTokens(header);
    const availableForContent = maxTokens - headerTokens - 10; // Buffer

    const maxChars = availableForContent * 4; // Approximate chars
    let content = doc.content;

    if (content.length > maxChars) {
      // Smart truncation: try to end at a sentence
      content = content.slice(0, maxChars);
      const lastPeriod = content.lastIndexOf(".");
      const lastNewline = content.lastIndexOf("\n");
      const cutPoint = Math.max(lastPeriod, lastNewline);

      if (cutPoint > maxChars * 0.7) {
        content = content.slice(0, cutPoint + 1);
      }
      content += "...";
    }

    return `${header}\n\n${content}`;
  }

  /**
   * Build context with explicit token budget
   */
  buildWithBudget(
    documents: RetrievedDocument[],
    tokenBudget: number
  ): BuiltContext {
    const configWithBudget = {
      ...this.config,
      maxTokens: tokenBudget,
      reservedForOutput: 0,
      reservedForPrompt: 0,
    };
    const builder = new ContextBuilder(configWithBudget);
    return builder.build(documents);
  }

  /**
   * Estimate token count for a set of documents
   */
  estimateTokens(documents: RetrievedDocument[]): number {
    return documents.reduce(
      (sum, doc) =>
        sum + DocumentChunker.estimateTokens(this.formatDocument(doc)),
      0
    );
  }

  /**
   * Get configuration
   */
  getConfig(): ContextWindowConfig {
    return { ...this.config };
  }
}

/**
 * Default context builder instance
 */
export const contextBuilder = new ContextBuilder();

/**
 * Convenience function
 */
export function buildContext(documents: RetrievedDocument[]): BuiltContext {
  return contextBuilder.build(documents);
}

export default contextBuilder;
