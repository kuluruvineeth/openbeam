import type { SessionMessage, SummarizationResult } from "@openbeam/types/ai";

const DEFAULT_MAX_MESSAGES_PER_SUMMARY = 50;
const DEFAULT_TOKEN_ESTIMATOR = (text: string) => Math.ceil(text.length / 4);
const PROGRESSIVE_RECENT_RATIO = 0.4;
const LIST_ITEM_PREFIX_PATTERN = /^[-*\d.)\]]+\s*/;
const NONE_PATTERN = /^none$/i;

export interface SummarizerOptions {
  maxMessagesPerSummary?: number;
  estimateTokens?: (text: string) => number;
  generateSummary: (prompt: string) => Promise<string>;
}

export interface SummarizerDeps {
  generateSummary: (prompt: string) => Promise<string>;
  estimateTokens?: (text: string) => number;
}

export async function summarizeMessages(
  messages: SessionMessage[],
  deps: SummarizerDeps
): Promise<SummarizationResult> {
  if (messages.length === 0) {
    return {
      summary: "",
      keyFacts: [],
      decisions: [],
      actionItems: [],
      messagesCovered: 0,
      tokensSaved: 0,
    };
  }

  const estimateTokens = deps.estimateTokens ?? DEFAULT_TOKEN_ESTIMATOR;
  const originalTokens = messages.reduce(
    (sum, msg) => sum + estimateTokens(msg.content),
    0
  );

  const transcript = formatTranscript(messages);
  const prompt = buildSummarizationPrompt(transcript);
  const rawResponse = await deps.generateSummary(prompt);
  const parsed = parseSummarizationResponse(rawResponse);

  const summaryTokens = estimateTokens(parsed.summary);
  const tokensSaved = Math.max(0, originalTokens - summaryTokens);

  return {
    ...parsed,
    messagesCovered: messages.length,
    tokensSaved,
  };
}

export async function progressiveSummarize(
  messages: SessionMessage[],
  existingSummary: string | null,
  deps: SummarizerDeps,
  options?: { maxMessagesPerSummary?: number }
): Promise<SummarizationResult> {
  const maxPerSummary =
    options?.maxMessagesPerSummary ?? DEFAULT_MAX_MESSAGES_PER_SUMMARY;

  if (messages.length <= maxPerSummary && !existingSummary) {
    return summarizeMessages(messages, deps);
  }

  const recentCount = Math.ceil(messages.length * PROGRESSIVE_RECENT_RATIO);
  const olderMessages = messages.slice(0, -recentCount);
  const recentMessages = messages.slice(-recentCount);

  let olderSummaryText = existingSummary ?? "";

  if (olderMessages.length > 0) {
    const olderTranscript = formatTranscript(olderMessages);
    const olderPrompt = existingSummary
      ? buildIncrementalSummarizationPrompt(existingSummary, olderTranscript)
      : buildSummarizationPrompt(olderTranscript);

    olderSummaryText = await deps.generateSummary(olderPrompt);
  }

  const recentTranscript = formatTranscript(recentMessages);
  const finalPrompt = buildProgressiveSummarizationPrompt(
    olderSummaryText,
    recentTranscript
  );
  const rawResponse = await deps.generateSummary(finalPrompt);
  const parsed = parseSummarizationResponse(rawResponse);

  const estimateTokens = deps.estimateTokens ?? DEFAULT_TOKEN_ESTIMATOR;
  const originalTokens = messages.reduce(
    (sum, msg) => sum + estimateTokens(msg.content),
    0
  );
  const summaryTokens = estimateTokens(parsed.summary);

  return {
    ...parsed,
    messagesCovered: messages.length,
    tokensSaved: Math.max(0, originalTokens - summaryTokens),
  };
}

function formatTranscript(messages: SessionMessage[]): string {
  return messages.map((msg) => `[${msg.role}]: ${msg.content}`).join("\n");
}

function buildSummarizationPrompt(transcript: string): string {
  return `<task>
Summarize the following conversation. Extract key information into structured sections.
</task>

<conversation>
${transcript}
</conversation>

<output_format>
Respond with exactly this format:

SUMMARY:
[A concise paragraph summarizing the conversation]

KEY_FACTS:
- [fact 1]
- [fact 2]

DECISIONS:
- [decision 1]
- [decision 2]

ACTION_ITEMS:
- [action item 1]
- [action item 2]
</output_format>

<instructions>
- Keep the summary concise but capture essential context
- Key facts are information that would be useful in future conversations
- Decisions are choices made during the conversation
- Action items are tasks that need to be done
- If a section has no entries, write NONE
</instructions>`;
}

function buildIncrementalSummarizationPrompt(
  existingSummary: string,
  newTranscript: string
): string {
  return `<task>
Update the existing summary with new conversation content.
</task>

<existing_summary>
${existingSummary}
</existing_summary>

<new_conversation>
${newTranscript}
</new_conversation>

<instructions>
Merge the existing summary with the new conversation content.
Produce a single unified summary that captures both.
Keep it concise. Remove redundant information.
Return ONLY the updated summary text, no formatting.
</instructions>`;
}

function buildProgressiveSummarizationPrompt(
  olderSummary: string,
  recentTranscript: string
): string {
  return `<task>
Create a comprehensive summary combining an older summary with recent conversation.
</task>

<older_summary>
${olderSummary}
</older_summary>

<recent_conversation>
${recentTranscript}
</recent_conversation>

<output_format>
Respond with exactly this format:

SUMMARY:
[A concise paragraph covering both older context and recent conversation]

KEY_FACTS:
- [fact 1]
- [fact 2]

DECISIONS:
- [decision 1]
- [decision 2]

ACTION_ITEMS:
- [action item 1]
- [action item 2]
</output_format>

<instructions>
- Combine older context with recent conversation into a unified summary
- Prioritize recent information but retain important older context
- Key facts, decisions, and action items should reflect the full history
- If a section has no entries, write NONE
</instructions>`;
}

interface ParsedSummarization {
  summary: string;
  keyFacts: string[];
  decisions: string[];
  actionItems: string[];
}

function parseSummarizationResponse(response: string): ParsedSummarization {
  const summary = extractSection(response, "SUMMARY");
  const keyFacts = extractListItems(response, "KEY_FACTS");
  const decisions = extractListItems(response, "DECISIONS");
  const actionItems = extractListItems(response, "ACTION_ITEMS");

  return {
    summary: summary || response.trim(),
    keyFacts,
    decisions,
    actionItems,
  };
}

function buildSectionPattern(sectionName: string): RegExp {
  const escaped = sectionName.replace(/_/g, "[_\\s]?");
  return new RegExp(
    `(?:^|\\n)\\s*(?:#{1,3}\\s*)?(?:\\*{1,2})?\\s*${escaped}\\s*:?\\s*(?:\\*{1,2})?\\s*\\n`,
    "i"
  );
}

const NEXT_SECTION_PATTERN =
  /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*{1,2})?\s*(?:SUMMARY|KEY[_\s]?FACTS|DECISIONS|ACTION[_\s]?ITEMS)\s*:?\s*(?:\*{1,2})?\s*\n/i;

function extractSection(text: string, sectionName: string): string {
  const pattern = buildSectionPattern(sectionName);
  const match = pattern.exec(text);
  if (!match) {
    return "";
  }

  const start = match.index + match[0].length;
  const remaining = text.slice(start);
  const nextMatch = NEXT_SECTION_PATTERN.exec(remaining);
  const sectionText = nextMatch
    ? remaining.slice(0, nextMatch.index)
    : remaining;

  return sectionText.trim();
}

function extractListItems(text: string, sectionName: string): string[] {
  const section = extractSection(text, sectionName);
  if (!section || NONE_PATTERN.test(section.trim())) {
    return [];
  }

  return section
    .split("\n")
    .map((line) => line.replace(LIST_ITEM_PREFIX_PATTERN, "").trim())
    .filter((line) => line.length > 0 && !NONE_PATTERN.test(line));
}
