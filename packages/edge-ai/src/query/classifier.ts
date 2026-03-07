import type { EdgeSLM, QueryClassification } from "@openbeam/types/edge/ai";
import { EDGE_QUERY_CLASSIFY_PROMPT, formatPrompt } from "../prompts/templates";
import { parseQueryClassification } from "../prompts/validators";

const FALLBACK_CLASSIFICATION: QueryClassification = {
  intent: "search",
  confidence: 0.5,
  entities: [],
};

export class QueryClassifier {
  private readonly slm: EdgeSLM;

  constructor(slm: EdgeSLM) {
    this.slm = slm;
  }

  async classify(query: string): Promise<QueryClassification> {
    const prompt = formatPrompt(EDGE_QUERY_CLASSIFY_PROMPT, { query });
    const response = await this.slm.generate(prompt, {
      maxTokens: 200,
      temperature: 0.1,
    });
    return parseQueryClassification(response.text) ?? FALLBACK_CLASSIFICATION;
  }
}
