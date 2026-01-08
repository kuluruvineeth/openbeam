import { buildXMLPrompt, type XMLSection } from "../rag/prompts";

export interface DynamicPromptContext {
  toolNames?: string[];
  skillNames?: string[];
  sessionContext?: SessionContextData;
  conversationSummary?: string;
  customSections?: XMLSection[];
}

export interface SessionContextData {
  sessionId: string;
  teamId: string;
  userId: string;
  startedAt: number;
  turnCount: number;
  activeTools?: string[];
  customData?: Record<string, unknown>;
}

export interface DynamicSystemPrompt {
  content: string;
  tokenEstimate: number;
  sections: string[];
}

const BASE_INSTRUCTIONS = `You are an AI assistant with access to enterprise data and tools.
Follow these principles:
1. Use tools when you need to retrieve or verify information
2. Cite sources for any factual claims
3. Be concise and direct in your responses
4. Ask clarifying questions when the request is ambiguous
5. Refuse tasks outside your capability honestly`;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildToolNamesSection(toolNames: string[]): XMLSection {
  if (toolNames.length === 0) {
    return {
      tag: "available_tools",
      content: "No tools are currently available.",
    };
  }

  const toolList = toolNames.map((name) => `- ${name}`).join("\n");
  return {
    tag: "available_tools",
    content: `The following tools are available. Use getToolInfo to learn how to use a specific tool before calling it.\n\n${toolList}`,
    attributes: { count: String(toolNames.length) },
  };
}

export function buildSkillNamesSection(skillNames: string[]): XMLSection {
  if (skillNames.length === 0) {
    return {
      tag: "available_skills",
      content: "No skills are currently available.",
    };
  }

  const skillList = skillNames.map((name) => `- ${name}`).join("\n");
  return {
    tag: "available_skills",
    content: `The following skills can be loaded on demand. Use getSkillContent to load a specific skill.\n\n${skillList}`,
    attributes: { count: String(skillNames.length) },
  };
}

export function buildSessionContextSection(
  session: SessionContextData
): XMLSection {
  const lines = [
    `Session ID: ${session.sessionId}`,
    `Team: ${session.teamId}`,
    `User: ${session.userId}`,
    `Started: ${new Date(session.startedAt).toISOString()}`,
    `Turn count: ${session.turnCount}`,
  ];

  if (session.activeTools && session.activeTools.length > 0) {
    lines.push(`Active tools: ${session.activeTools.join(", ")}`);
  }

  if (session.customData) {
    for (const [key, value] of Object.entries(session.customData)) {
      lines.push(
        `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`
      );
    }
  }

  return {
    tag: "session_context",
    content: lines.join("\n"),
    attributes: { turn: String(session.turnCount) },
  };
}

export function buildConversationSummarySection(summary: string): XMLSection {
  return {
    tag: "conversation_summary",
    content: summary,
  };
}

export function buildDynamicSystemPrompt(
  context: DynamicPromptContext
): DynamicSystemPrompt {
  const sections: XMLSection[] = [];
  const includedSections: string[] = [];

  sections.push({
    tag: "instructions",
    content: BASE_INSTRUCTIONS,
  });
  includedSections.push("instructions");

  if (context.toolNames && context.toolNames.length > 0) {
    sections.push(buildToolNamesSection(context.toolNames));
    includedSections.push("available_tools");
  }

  if (context.skillNames && context.skillNames.length > 0) {
    sections.push(buildSkillNamesSection(context.skillNames));
    includedSections.push("available_skills");
  }

  if (context.sessionContext) {
    sections.push(buildSessionContextSection(context.sessionContext));
    includedSections.push("session_context");
  }

  if (context.conversationSummary) {
    sections.push(buildConversationSummarySection(context.conversationSummary));
    includedSections.push("conversation_summary");
  }

  if (context.customSections) {
    for (const section of context.customSections) {
      sections.push(section);
      includedSections.push(section.tag);
    }
  }

  const content = buildXMLPrompt(sections);

  return {
    content,
    tokenEstimate: estimateTokens(content),
    sections: includedSections,
  };
}

export interface PromptBuilder {
  withToolNames(names: string[]): PromptBuilder;
  withSkillNames(names: string[]): PromptBuilder;
  withSessionContext(session: SessionContextData): PromptBuilder;
  withConversationSummary(summary: string): PromptBuilder;
  withCustomSection(section: XMLSection): PromptBuilder;
  build(): DynamicSystemPrompt;
}

export function createPromptBuilder(): PromptBuilder {
  const context: DynamicPromptContext = {};

  const builder: PromptBuilder = {
    withToolNames(names: string[]) {
      context.toolNames = names;
      return builder;
    },
    withSkillNames(names: string[]) {
      context.skillNames = names;
      return builder;
    },
    withSessionContext(session: SessionContextData) {
      context.sessionContext = session;
      return builder;
    },
    withConversationSummary(summary: string) {
      context.conversationSummary = summary;
      return builder;
    },
    withCustomSection(section: XMLSection) {
      if (!context.customSections) {
        context.customSections = [];
      }
      context.customSections.push(section);
      return builder;
    },
    build() {
      return buildDynamicSystemPrompt(context);
    },
  };

  return builder;
}
