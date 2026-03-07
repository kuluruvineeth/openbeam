import type { EdgeSLM, NEREntity } from "@openbeam/types/edge/ai";
import { EDGE_NER_PROMPT, formatPrompt } from "../prompts/templates";
import { parseNERResponse } from "../prompts/validators";

export class EdgeNER {
  private readonly slm: EdgeSLM;

  constructor(slm: EdgeSLM) {
    this.slm = slm;
  }

  async extract(text: string): Promise<NEREntity[]> {
    const prompt = formatPrompt(EDGE_NER_PROMPT, { text });
    const response = await this.slm.generate(prompt, {
      maxTokens: 500,
      temperature: 0.1,
    });
    return parseNERResponse(response.text);
  }
}
