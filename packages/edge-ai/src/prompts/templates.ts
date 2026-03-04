export const EDGE_RAG_PROMPT = `You are an AI assistant running on an edge device. Answer the user's question using ONLY the provided context documents. If the context doesn't contain enough information, say so.

Context Documents:
{context}

Question: {query}

Instructions:
- Answer concisely (max 3 sentences)
- Cite document titles when referencing information
- If unsure, say "I don't have enough information to answer this"

Answer:`;

export const EDGE_NER_PROMPT = `Extract named entities from the following text. Return a JSON array of objects with fields: text, label, start, end, confidence.

Valid labels: PERSON, ORGANIZATION, LOCATION, DATE, PRODUCT, EVENT, DOCUMENT

Text: {text}

Return ONLY valid JSON array:`;

export const EDGE_QUERY_REWRITE_PROMPT = `Rewrite the following search query to improve search results. Expand abbreviations, add synonyms, and clarify ambiguous terms.

Original query: {query}

Return ONLY the rewritten query, nothing else:`;

export const EDGE_QUERY_CLASSIFY_PROMPT = `Classify the following query into one of these intents: search, question, navigation, command, conversation.

Also extract any named entities.

Query: {query}

Return JSON with fields:
- intent: one of [search, question, navigation, command, conversation]
- confidence: number between 0 and 1
- entities: array of {text, label, start, end, confidence}
- suggestedRewrite: optional improved query

Return ONLY valid JSON:`;

export const EDGE_SUMMARIZE_PROMPT = `Summarize the following text concisely in 2-3 sentences.

Text: {text}

Summary:`;

export function formatPrompt(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
