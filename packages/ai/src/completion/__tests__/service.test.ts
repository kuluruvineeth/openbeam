import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { ChatMessage } from "@openplane/types/ai";

const mockGenerateTextResult = {
  text: "Generated response text",
  finishReason: "stop",
  usage: {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
  },
  toolCalls: [],
};

let generateTextMock: ReturnType<typeof mock>;
let streamTextMock: ReturnType<typeof mock>;

mock.module("ai", () => {
  generateTextMock = mock(() => Promise.resolve(mockGenerateTextResult));
  streamTextMock = mock(() => ({
    textStream: (function* () {
      yield "Hello";
      yield " world";
    })(),
    fullStream: (function* () {
      yield { type: "text-delta", textDelta: "Hello" };
      yield { type: "text-delta", textDelta: " world" };
    })(),
    usage: Promise.resolve({ inputTokens: 100, outputTokens: 50 }),
    finishReason: Promise.resolve("stop"),
  }));

  return {
    generateText: generateTextMock,
    streamText: streamTextMock,
  };
});

mock.module("../config", () => ({
  getConfig: () => ({
    defaultProvider: "openai",
    defaultChatModel: "gpt-4",
    completion: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1,
    },
  }),
}));

const mockChatModel = { id: "mock-model" };

mock.module("../providers/registry", () => ({
  registry: {
    chatModel: mock(() => mockChatModel),
  },
}));

mock.module("../providers/thinking", () => ({
  buildThinkingProviderOptions: mock(() => ({})),
  extractReasoningContent: mock(() => null),
}));

mock.module("../resilience/errors", () => ({
  AIProviderError: class extends Error {
    code: string;
    provider: string;
    retryAfterMs?: number;

    constructor(
      code: string,
      message: string,
      provider: string,
      retryAfterMs?: number
    ) {
      super(message);
      this.code = code;
      this.provider = provider;
      this.retryAfterMs = retryAfterMs;
    }
  },
  classifyError: mock((error: Error) => ({
    code: "UNKNOWN_ERROR",
    message: error.message,
    retryable: false,
  })),
}));

let CompletionService: typeof import("../service").CompletionService;
let complete: typeof import("../service").complete;
let completeWithContext: typeof import("../service").completeWithContext;

beforeAll(async () => {
  const mod = await import("../service");
  CompletionService = mod.CompletionService;
  complete = mod.complete;
  completeWithContext = mod.completeWithContext;
});

beforeEach(() => {
  generateTextMock.mockClear();
  streamTextMock.mockClear();
  generateTextMock.mockResolvedValue(mockGenerateTextResult);
});

describe("CompletionService", () => {
  describe("complete", () => {
    it("generates completion for simple message", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

      const result = await service.complete(messages);

      expect(result.content).toBe("Generated response text");
      expect(result.role).toBe("assistant");
      expect(result.finishReason).toBe("stop");
      expect(result.usage?.totalTokens).toBe(150);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("includes system prompt when provided", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

      await service.complete(messages, {
        systemPrompt: "You are a helpful assistant",
      });

      expect(generateTextMock).toHaveBeenCalledTimes(1);
      const callArgs = generateTextMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      const sdkMessages = callArgs?.messages as Array<{ role: string }>;
      expect(sdkMessages?.[0]?.role).toBe("system");
    });

    it("uses service default system prompt", async () => {
      const service = new CompletionService({
        systemPrompt: "Default system prompt",
      });
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

      await service.complete(messages);

      const callArgs = generateTextMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      const sdkMessages = callArgs?.messages as Array<{
        role: string;
        content: string;
      }>;
      expect(sdkMessages?.[0]?.content).toBe("Default system prompt");
    });

    it("converts tool messages correctly", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [
        { role: "user", content: "Search for something" },
        {
          role: "tool",
          content: '{"result": "data"}',
          toolCallId: "call_123",
          name: "search",
        },
      ];

      await service.complete(messages);

      const callArgs = generateTextMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      const sdkMessages = callArgs?.messages as Array<{
        role: string;
        content: unknown;
      }>;
      expect(sdkMessages?.[1]?.role).toBe("tool");
    });

    it("handles tool calls in response", async () => {
      generateTextMock.mockResolvedValue({
        ...mockGenerateTextResult,
        toolCalls: [
          {
            toolCallId: "call_123",
            toolName: "search",
            input: { query: "test" },
          },
        ],
      });

      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Search" }];

      const result = await service.complete(messages);

      expect(result.toolCalls).toHaveLength(1);
      const firstToolCall = result.toolCalls?.[0];
      expect(firstToolCall?.name).toBe("search");
      expect(firstToolCall?.arguments).toEqual({ query: "test" });
    });

    it("calls onComplete callback", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      // biome-ignore lint/suspicious/noEmptyBlockStatements: mock callback
      const onComplete = mock(() => {});

      await service.complete(messages, { onComplete });

      expect(onComplete).toHaveBeenCalledTimes(1);
      const callArg = onComplete.mock.calls[0]?.[0];
      expect(callArg).toBeDefined();
      expect(callArg).toMatchObject({
        content: "Generated response text",
        role: "assistant",
      });
    });

    it("passes temperature and other options", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

      await service.complete(messages, {
        temperature: 0.5,
        maxTokens: 1000,
        topP: 0.9,
      });

      const callArgs = generateTextMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(callArgs?.temperature).toBe(0.5);
      expect(callArgs?.maxOutputTokens).toBe(1000);
      expect(callArgs?.topP).toBe(0.9);
    });

    it("wraps errors in AIProviderError", async () => {
      const originalError = new Error("API error");
      generateTextMock.mockRejectedValue(originalError);

      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

      await expect(service.complete(messages)).rejects.toThrow("API error");
    });
  });

  describe("stream", () => {
    it("yields text chunks from stream", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      const chunks: Array<{ type: string; content?: string }> = [];

      for await (const chunk of service.stream(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      const textChunks = chunks.filter((c) => c.type === "text");
      expect(textChunks).toHaveLength(2);
      expect(textChunks[0]?.content).toBe("Hello");
      expect(textChunks[1]?.content).toBe(" world");
    });

    it("yields done chunk with usage info", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      const chunks: Array<{
        type: string;
        content?: string;
        usage?: { inputTokens: number; outputTokens: number };
      }> = [];

      for await (const chunk of service.stream(messages)) {
        chunks.push(chunk);
      }

      const doneChunk = chunks.find((c) => c.type === "done");
      expect(doneChunk).toBeDefined();
      expect(doneChunk?.usage?.inputTokens).toBe(100);
      expect(doneChunk?.usage?.outputTokens).toBe(50);
    });

    it("calls onToken callback for each token", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      // biome-ignore lint/suspicious/noEmptyBlockStatements: mock callback
      const onToken = mock(() => {});
      const chunks: unknown[] = [];

      for await (const chunk of service.stream(messages, { onToken })) {
        chunks.push(chunk);
      }

      expect(onToken).toHaveBeenCalledTimes(2);
    });

    it("calls onComplete callback at end", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      // biome-ignore lint/suspicious/noEmptyBlockStatements: mock callback
      const onComplete = mock(() => {});
      const chunks: unknown[] = [];

      for await (const chunk of service.stream(messages, { onComplete })) {
        chunks.push(chunk);
      }

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("streamText", () => {
    it("yields only text content", async () => {
      const service = new CompletionService();
      const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
      const texts: string[] = [];

      for await (const text of service.streamText(messages)) {
        texts.push(text);
      }

      expect(texts.length).toBeGreaterThan(0);
      expect(texts.every((t) => typeof t === "string")).toBe(true);
    });
  });

  describe("completeWithContext", () => {
    it("builds context from documents", async () => {
      const service = new CompletionService();
      const query = "What is the answer?";
      const context = {
        documents: [
          {
            id: "doc1",
            title: "Test Document",
            content: "The answer is 42",
            source: "test",
            relevanceScore: 0.9,
          },
        ],
      };

      const result = await service.completeWithContext(query, context);

      expect(result.contextUsed).toBe(1);
      expect(generateTextMock).toHaveBeenCalledTimes(1);
      const callArgs = generateTextMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      const sdkMessages = callArgs?.messages as Array<{
        role: string;
        content: string;
      }>;
      const userMessage = sdkMessages?.find((m) => m.role === "user");
      expect(userMessage?.content).toContain("Test Document");
      expect(userMessage?.content).toContain("What is the answer?");
    });

    it("extracts citations from response", async () => {
      generateTextMock.mockResolvedValue({
        ...mockGenerateTextResult,
        text: "According to Test Document, the answer is 42",
      });

      const service = new CompletionService();
      const context = {
        documents: [
          {
            id: "doc1",
            title: "Test Document",
            content: "The answer is 42",
            relevanceScore: 0.9,
          },
        ],
      };

      const result = await service.completeWithContext("What?", context);

      expect(result.citations).toHaveLength(1);
      const firstCitation = result.citations[0];
      expect(firstCitation?.title).toBe("Test Document");
    });

    it("uses RAG system prompt by default", async () => {
      const service = new CompletionService();

      await service.completeWithContext("query", { documents: [] });

      const callArgs = generateTextMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      const sdkMessages = callArgs?.messages as Array<{
        role: string;
        content: string;
      }>;
      const systemMessage = sdkMessages?.find((m) => m.role === "system");
      expect(systemMessage?.content).toContain("helpful AI assistant");
    });

    it("handles empty documents", async () => {
      const service = new CompletionService();

      const result = await service.completeWithContext("query", {
        documents: [],
      });

      expect(result.contextUsed).toBe(0);
      const callArgs = generateTextMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      const sdkMessages = callArgs?.messages as Array<{
        role: string;
        content: string;
      }>;
      const userMessage = sdkMessages?.find((m) => m.role === "user");
      expect(userMessage?.content).toContain("No relevant documents found");
    });
  });

  describe("chat", () => {
    it("appends messages to conversation", async () => {
      const service = new CompletionService();
      const conversation = {
        id: "conv1",
        messages: [
          { role: "user" as const, content: "Hi" },
          { role: "assistant" as const, content: "Hello!" },
        ],
      };

      const { conversation: updated } = await service.chat(
        "How are you?",
        conversation
      );

      expect(updated.messages.length).toBe(4);
      expect(updated.messages[2]?.content).toBe("How are you?");
      expect(updated.messages[3]?.role).toBe("assistant");
    });
  });

  describe("withConfig", () => {
    it("creates new instance with updated config", () => {
      const service = new CompletionService({ modelId: "gpt-3.5" });
      const updated = service.withConfig({ modelId: "gpt-4" });

      expect(updated.getConfig().modelId).toBe("gpt-4");
      expect(service.getConfig().modelId).toBe("gpt-3.5");
    });
  });
});

describe("module exports", () => {
  it("complete function works", async () => {
    const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];
    const result = await complete(messages);

    expect(result.content).toBe("Generated response text");
  });

  it("completeWithContext function works", async () => {
    const result = await completeWithContext("query", { documents: [] });

    expect(result.contextUsed).toBe(0);
  });
});
