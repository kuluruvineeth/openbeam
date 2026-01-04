import type {
  MCPContent,
  MCPPromptArgument,
  MCPPromptDefinition,
  MCPPromptMessage,
  MCPPromptResult,
  MCPServerContext,
} from "./types";

export type PromptHandler = (
  args: Record<string, string>,
  context: MCPServerContext
) => Promise<MCPPromptResult>;

interface RegisteredPrompt {
  definition: MCPPromptDefinition;
  handler: PromptHandler;
}

export class PromptRegistry {
  private readonly prompts = new Map<string, RegisteredPrompt>();

  register(definition: MCPPromptDefinition, handler: PromptHandler): void {
    this.prompts.set(definition.name, { definition, handler });
  }

  list(): MCPPromptDefinition[] {
    return Array.from(this.prompts.values()).map(
      ({ definition }) => definition
    );
  }

  has(name: string): boolean {
    return this.prompts.has(name);
  }

  get(
    name: string,
    args: Record<string, string>,
    context: MCPServerContext
  ): Promise<MCPPromptResult | null> {
    const registered = this.prompts.get(name);
    if (!registered) {
      return Promise.resolve(null);
    }

    const validationError = this.validateArguments(
      registered.definition.arguments,
      args
    );
    if (validationError) {
      return Promise.reject(new Error(validationError));
    }

    return registered.handler(args, context);
  }

  private validateArguments(
    schema: MCPPromptArgument[] | undefined,
    args: Record<string, string>
  ): string | null {
    if (!schema) {
      return null;
    }

    for (const arg of schema) {
      if (arg.required && !(arg.name in args)) {
        return `Missing required argument: ${arg.name}`;
      }
    }

    return null;
  }

  clear(): void {
    this.prompts.clear();
  }
}

export function createTextContent(text: string): MCPContent {
  return { type: "text", text };
}

export function createUserMessage(text: string): MCPPromptMessage {
  return { role: "user", content: createTextContent(text) };
}

export function createAssistantMessage(text: string): MCPPromptMessage {
  return { role: "assistant", content: createTextContent(text) };
}

export function defineEnterpriseSearchPrompt(): MCPPromptDefinition {
  return {
    name: "enterprise-search",
    description:
      "Search across all connected enterprise data sources with optional filters",
    arguments: [
      { name: "query", description: "The search query", required: true },
      {
        name: "sources",
        description: "Comma-separated list of source types to search",
        required: false,
      },
      {
        name: "limit",
        description: "Maximum number of results (default: 10)",
        required: false,
      },
    ],
  };
}

export function defineDocumentSummaryPrompt(): MCPPromptDefinition {
  return {
    name: "document-summary",
    description: "Generate a summary of a specific document by ID",
    arguments: [
      {
        name: "documentId",
        description: "The unique document identifier",
        required: true,
      },
      {
        name: "length",
        description: "Summary length: brief, standard, or detailed",
        required: false,
      },
    ],
  };
}

export function defineAnswerQuestionPrompt(): MCPPromptDefinition {
  return {
    name: "answer-question",
    description:
      "Answer a question using enterprise knowledge base with citations",
    arguments: [
      {
        name: "question",
        description: "The question to answer",
        required: true,
      },
      {
        name: "context",
        description: "Additional context to inform the answer",
        required: false,
      },
    ],
  };
}

export function defineAnalyzeDocumentsPrompt(): MCPPromptDefinition {
  return {
    name: "analyze-documents",
    description: "Analyze a set of documents for themes, entities, or patterns",
    arguments: [
      {
        name: "documentIds",
        description: "Comma-separated list of document IDs",
        required: true,
      },
      {
        name: "analysisType",
        description: "Type of analysis: themes, entities, timeline, comparison",
        required: false,
      },
    ],
  };
}

export function defineExplainConnectorPrompt(): MCPPromptDefinition {
  return {
    name: "explain-connector",
    description:
      "Explain how a specific data connector works and its capabilities",
    arguments: [
      {
        name: "connectorType",
        description: "The connector type (e.g., slack, notion, github)",
        required: true,
      },
    ],
  };
}

export function defineFindExpertPrompt(): MCPPromptDefinition {
  return {
    name: "find-expert",
    description:
      "Find team members with expertise in a specific topic based on their document interactions",
    arguments: [
      {
        name: "topic",
        description: "The topic or skill to find experts for",
        required: true,
      },
    ],
  };
}

export function getDefaultPromptDefinitions(): MCPPromptDefinition[] {
  return [
    defineEnterpriseSearchPrompt(),
    defineDocumentSummaryPrompt(),
    defineAnswerQuestionPrompt(),
    defineAnalyzeDocumentsPrompt(),
    defineExplainConnectorPrompt(),
    defineFindExpertPrompt(),
  ];
}

export function buildSearchPromptMessages(
  args: Record<string, string>
): MCPPromptMessage[] {
  const { query, sources, limit } = args;
  const sourceFilter = sources ? ` Filter to these sources: ${sources}.` : "";
  const limitClause = limit ? ` Return up to ${limit} results.` : "";

  return [
    createUserMessage(
      `Search across all connected enterprise data sources for: "${query}"${sourceFilter}${limitClause} ` +
        "Provide results with titles, snippets, and source information."
    ),
  ];
}

export function buildSummaryPromptMessages(
  args: Record<string, string>
): MCPPromptMessage[] {
  const { documentId, length = "standard" } = args;
  const lengthInstruction =
    {
      brief: "Provide a 2-3 sentence summary.",
      standard: "Provide a comprehensive paragraph summary.",
      detailed:
        "Provide a detailed multi-paragraph summary covering all key points.",
    }[length] ?? "Provide a comprehensive paragraph summary.";

  return [
    createUserMessage(
      `Summarize the document with ID "${documentId}". ${lengthInstruction} ` +
        "Include the document title and source in your response."
    ),
  ];
}

export function buildAnswerPromptMessages(
  args: Record<string, string>
): MCPPromptMessage[] {
  const { question, context } = args;
  const contextClause = context ? ` Additional context: ${context}` : "";

  return [
    createUserMessage(
      `Answer this question using the enterprise knowledge base: "${question}"${contextClause} ` +
        "Cite specific documents as sources. If you cannot find relevant information, say so."
    ),
  ];
}

export function buildAnalysisPromptMessages(
  args: Record<string, string>
): MCPPromptMessage[] {
  const { documentIds, analysisType = "themes" } = args;
  const analysisInstructions =
    {
      themes: "Identify the main themes and topics across these documents.",
      entities:
        "Extract key entities (people, organizations, products, dates) from these documents.",
      timeline:
        "Create a timeline of events based on the content of these documents.",
      comparison:
        "Compare and contrast the content of these documents, highlighting similarities and differences.",
    }[analysisType] ??
    "Identify the main themes and topics across these documents.";

  return [
    createUserMessage(
      `Analyze the documents with IDs: ${documentIds}. ${analysisInstructions}`
    ),
  ];
}

export function buildConnectorExplanationMessages(
  args: Record<string, string>
): MCPPromptMessage[] {
  const { connectorType } = args;

  return [
    createUserMessage(
      `Explain the ${connectorType} connector: What data does it sync? How often? ` +
        "What permissions are required? What entities are indexed?"
    ),
  ];
}

export function buildExpertFinderMessages(
  args: Record<string, string>
): MCPPromptMessage[] {
  const { topic } = args;

  return [
    createUserMessage(
      `Find team members who have expertise in "${topic}". ` +
        "Look at document authorship, edit history, and engagement patterns. " +
        "List potential experts with evidence of their expertise."
    ),
  ];
}

export const promptRegistry = new PromptRegistry();

export function createPromptRegistry(): PromptRegistry {
  return new PromptRegistry();
}
