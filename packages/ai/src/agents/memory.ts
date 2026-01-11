import {
  type ConnectedResource,
  type ContextMdOptions,
  createContextMdBuilder,
  type RecentActivity,
  type SessionState,
  type TeamGuidelines,
  type UserPreferences,
} from "../context/context-md";
import type { MemoryConsolidator } from "../memory/consolidator";
import type { AgentExecutionContext, AgentState } from "./config";

export interface AgentMemoryConfig {
  memory: MemoryConsolidator;
  maxContextTokens?: number;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
  includeProcedural?: boolean;
  recencyBias?: number;
}

export interface AgentContextData {
  teamId: string;
  userId: string;
  teamName: string;
  userName?: string;
  agentRole?: string;
  preferences?: Partial<UserPreferences>;
  guidelines?: Partial<TeamGuidelines>;
  connectedResources?: ConnectedResource[];
  recentActivity?: RecentActivity[];
  sessionState?: Partial<SessionState>;
}

export interface LoadedAgentMemory {
  contextMd: string;
  episodic: string;
  semantic: string;
  procedural: string;
  tokenCount: number;
  entryCount: number;
}

const DEFAULT_MEMORY_CONFIG: Required<Omit<AgentMemoryConfig, "memory">> = {
  maxContextTokens: 4000,
  includeEpisodic: true,
  includeSemantic: true,
  includeProcedural: true,
  recencyBias: 0.3,
};

export async function loadAgentMemory(
  config: AgentMemoryConfig,
  ctx: AgentExecutionContext,
  contextData: AgentContextData
): Promise<LoadedAgentMemory> {
  const opts = { ...DEFAULT_MEMORY_CONFIG, ...config };
  const { memory } = config;

  const types: ("episodic" | "semantic" | "procedural")[] = [];
  if (opts.includeEpisodic) {
    types.push("episodic");
  }
  if (opts.includeSemantic) {
    types.push("semantic");
  }
  if (opts.includeProcedural) {
    types.push("procedural");
  }

  const consolidated = await memory.consolidate({
    query: "",
    teamId: ctx.teamId,
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    types,
    limit: 50,
  });

  const builder = createContextMdBuilder(
    contextData.teamId,
    contextData.userId,
    contextData.teamName
  );

  builder.setIdentity({
    teamId: contextData.teamId,
    userId: contextData.userId,
    teamName: contextData.teamName,
    userName: contextData.userName,
    agentRole: contextData.agentRole,
  });

  if (contextData.preferences) {
    builder.setPreferences(contextData.preferences);
  }

  if (contextData.guidelines) {
    builder.setGuidelines(contextData.guidelines);
  }

  if (contextData.connectedResources) {
    for (const resource of contextData.connectedResources) {
      builder.addResource(resource);
    }
  }

  if (contextData.recentActivity) {
    for (const activity of contextData.recentActivity) {
      builder.addActivity(activity);
    }
  }

  if (contextData.sessionState) {
    builder.updateSession(contextData.sessionState);
  }

  builder.setMemory({
    episodic: consolidated.episodic,
    semantic: consolidated.semantic,
    procedural: consolidated.procedural,
  });

  const contextMdOptions: ContextMdOptions = {
    maxTokenBudget: opts.maxContextTokens,
    includeMemory: true,
  };

  const contextMd = builder.build(contextMdOptions);

  return {
    contextMd,
    episodic: consolidated.episodic,
    semantic: consolidated.semantic,
    procedural: consolidated.procedural,
    tokenCount: consolidated.tokenCount,
    entryCount: consolidated.entryCount,
  };
}

export interface SystemPromptOptions {
  basePrompt?: string;
  contextMd: string;
  additionalInstructions?: string[];
  toolContext?: string;
}

export function buildAgentSystemPrompt(options: SystemPromptOptions): string {
  const sections: string[] = [];

  if (options.basePrompt) {
    sections.push(options.basePrompt);
  }

  sections.push(`<context>
${options.contextMd}
</context>`);

  if (options.toolContext) {
    sections.push(`<available_tools>
${options.toolContext}
</available_tools>`);
  }

  if (options.additionalInstructions?.length) {
    sections.push(`<additional_instructions>
${options.additionalInstructions.map((i) => `- ${i}`).join("\n")}
</additional_instructions>`);
  }

  return sections.join("\n\n");
}

export interface AgentMemoryManager {
  load(
    ctx: AgentExecutionContext,
    contextData: AgentContextData
  ): Promise<LoadedAgentMemory>;
  buildSystemPrompt(options: SystemPromptOptions): string;
  storeConversation(
    input: string,
    output: string,
    ctx: AgentExecutionContext,
    turnNumber: number
  ): Promise<void>;
  storeToolCall(
    toolName: string,
    input: unknown,
    output: unknown,
    success: boolean,
    ctx: AgentExecutionContext
  ): Promise<void>;
  learnFact(
    content: string,
    category: string,
    sources: string[],
    ctx: AgentExecutionContext,
    confidence?: number
  ): Promise<string>;
  learnProcedure(
    pattern: string,
    trigger: string,
    action: string,
    ctx: AgentExecutionContext
  ): Promise<string>;
  recordProcedureOutcome(procedureId: string, success: boolean): Promise<void>;
  suggestAction(
    trigger: string,
    ctx: AgentExecutionContext
  ): Promise<{ action: string; confidence: number } | null>;
  getRelevantKnowledge(
    query: string,
    ctx: AgentExecutionContext,
    categories?: string[]
  ): Promise<Array<{ content: string; category: string; confidence: number }>>;
  getStats(teamId: string): Promise<{
    episodic: number;
    semantic: number;
    procedural: number;
    total: number;
  }>;
}

export function createAgentMemoryManager(
  config: AgentMemoryConfig
): AgentMemoryManager {
  const { memory } = config;

  return {
    async load(ctx, contextData) {
      return await loadAgentMemory(config, ctx, contextData);
    },

    buildSystemPrompt(options) {
      return buildAgentSystemPrompt(options);
    },

    async storeConversation(input, output, ctx, turnNumber) {
      await memory.storeConversationTurn(input, output, {
        teamId: ctx.teamId,
        userId: ctx.userId,
        sessionId: ctx.sessionId ?? `session_${Date.now()}`,
        turnNumber,
      });
    },

    // biome-ignore lint/nursery/useMaxParams: matches MemoryConsolidator interface
    async storeToolCall(toolName, input, output, success, ctx) {
      await memory.storeToolCall(toolName, input, output, success, {
        teamId: ctx.teamId,
        userId: ctx.userId,
        sessionId: ctx.sessionId ?? `session_${Date.now()}`,
      });
    },

    // biome-ignore lint/nursery/useMaxParams: matches MemoryConsolidator interface
    async learnFact(content, category, sources, ctx, confidence = 0.7) {
      return await memory.learnFact(content, category, sources, {
        teamId: ctx.teamId,
        userId: ctx.userId,
        confidence,
      });
    },

    async learnProcedure(pattern, trigger, action, ctx) {
      return await memory.learnProcedure(pattern, trigger, action, {
        teamId: ctx.teamId,
        userId: ctx.userId,
      });
    },

    async recordProcedureOutcome(procedureId, success) {
      await memory.recordProcedureOutcome(procedureId, success);
    },

    async suggestAction(trigger, ctx) {
      return await memory.suggestAction(trigger, ctx.teamId);
    },

    async getRelevantKnowledge(query, ctx, categories) {
      const entries = await memory.getRelevantKnowledge(
        query,
        ctx.teamId,
        categories
      );
      return entries.map((e) => ({
        content: e.content,
        category: e.category,
        confidence: e.confidence,
      }));
    },

    async getStats(teamId) {
      return await memory.getStats(teamId);
    },
  };
}

export function injectMemoryIntoState(
  state: AgentState,
  loadedMemory: LoadedAgentMemory
): AgentState {
  state.values.set("__contextMd", loadedMemory.contextMd);
  state.values.set("__memoryTokens", loadedMemory.tokenCount);
  state.values.set("__memoryEntries", loadedMemory.entryCount);

  return state;
}

export function extractContextMdFromState(state: AgentState): string | null {
  return (state.values.get("__contextMd") as string) ?? null;
}

export interface WithMemoryOptions {
  memory: MemoryConsolidator;
  contextData: AgentContextData;
  basePrompt?: string;
  additionalInstructions?: string[];
}

export async function withAgentMemory<T>(
  ctx: AgentExecutionContext,
  options: WithMemoryOptions,
  execute: (
    enrichedContext: AgentExecutionContext,
    systemPrompt: string,
    loadedMemory: LoadedAgentMemory
  ) => Promise<T>
): Promise<T> {
  const memoryConfig: AgentMemoryConfig = {
    memory: options.memory,
  };

  const loadedMemory = await loadAgentMemory(
    memoryConfig,
    ctx,
    options.contextData
  );

  const systemPrompt = buildAgentSystemPrompt({
    basePrompt: options.basePrompt,
    contextMd: loadedMemory.contextMd,
    additionalInstructions: options.additionalInstructions,
  });

  const enrichedCtx: AgentExecutionContext = {
    ...ctx,
    state: injectMemoryIntoState(ctx.state, loadedMemory),
  };

  return execute(enrichedCtx, systemPrompt, loadedMemory);
}

export interface MemoryEnrichedAgentConfig {
  memoryManager: AgentMemoryManager;
  contextData: AgentContextData;
  onConversationTurn?: (turnNumber: number) => void;
  onToolCall?: (toolName: string, success: boolean) => void;
  onFactLearned?: (factId: string, category: string) => void;
}

export function createMemoryCallbacks(
  manager: AgentMemoryManager,
  ctx: AgentExecutionContext,
  config?: Partial<MemoryEnrichedAgentConfig>
) {
  let turnNumber = 0;

  return {
    async onStepFinish(event: {
      text: string;
      toolCalls: Array<{ toolName: string; input: unknown }>;
      toolResults: Array<{ toolName: string; output: unknown }>;
    }) {
      for (let i = 0; i < event.toolCalls.length; i++) {
        const call = event.toolCalls[i];
        if (!call) {
          continue;
        }

        const result = event.toolResults[i];
        const success = result !== undefined;

        await manager.storeToolCall(
          call.toolName,
          call.input,
          result?.output,
          success,
          ctx
        );

        config?.onToolCall?.(call.toolName, success);
      }
    },

    async onConversationTurn(input: string, output: string) {
      turnNumber += 1;
      await manager.storeConversation(input, output, ctx, turnNumber);
      config?.onConversationTurn?.(turnNumber);
    },

    async onFactDiscovered(
      content: string,
      category: string,
      sources: string[]
    ) {
      const factId = await manager.learnFact(content, category, sources, ctx);
      config?.onFactLearned?.(factId, category);
      return factId;
    },
  };
}
