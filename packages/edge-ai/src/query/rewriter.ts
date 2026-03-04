import type { EdgeSLM } from "@openplane/types/edge/ai";
import { EDGE_QUERY_REWRITE_PROMPT, formatPrompt } from "../prompts/templates";

export class QueryRewriter {
  private readonly slm: EdgeSLM;

  constructor(slm: EdgeSLM) {
    this.slm = slm;
  }

  async rewrite(query: string): Promise<string> {
    const prompt = formatPrompt(EDGE_QUERY_REWRITE_PROMPT, { query });
    const response = await this.slm.generate(prompt, {
      maxTokens: 100,
      temperature: 0.1,
    });
    return response.text.trim() || query;
  }
}
