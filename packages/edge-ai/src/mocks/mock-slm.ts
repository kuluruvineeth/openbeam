import type {
  EdgeGenerateOptions,
  EdgeSLM,
  EdgeSLMResponse,
} from "@openplane/types/edge/ai";

const WHITESPACE_RE = /\s+/;

export class MockSLM implements EdgeSLM {
  private readonly responses: Map<string, string> = new Map();
  private readonly defaultResponse: string;
  private available = true;
  private readonly latencyMs: number;
  private readonly _modelId: string;

  constructor(options?: {
    modelId?: string;
    defaultResponse?: string;
    latencyMs?: number;
  }) {
    this._modelId = options?.modelId ?? "mock-slm";
    this.defaultResponse =
      options?.defaultResponse ?? "This is a mock response.";
    this.latencyMs = options?.latencyMs ?? 10;
  }

  setResponse(promptContains: string, response: string): void {
    this.responses.set(promptContains, response);
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  async generate(
    prompt: string,
    _options?: Partial<EdgeGenerateOptions>
  ): Promise<EdgeSLMResponse> {
    if (!this.available) {
      throw new Error("Model is not available");
    }

    const start = performance.now();

    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    let text = this.defaultResponse;
    for (const [key, value] of this.responses) {
      if (prompt.includes(key)) {
        text = value;
        break;
      }
    }

    const words = text.split(WHITESPACE_RE).length;
    const tokensUsed = Math.ceil(words / 0.75);

    return {
      text,
      tokensUsed,
      latencyMs: performance.now() - start,
      truncated: false,
    };
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  modelId(): string {
    return this._modelId;
  }
}
