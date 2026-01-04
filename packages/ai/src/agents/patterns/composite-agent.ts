import type {
  AgentConfig,
  AggregatorConfig,
  CoordinatorAgentConfig,
  LlmAgentConfig,
  LoopAgentConfig,
  ModelConfig,
  ParallelAgentConfig,
  SequentialAgentConfig,
  StateConfig,
  StopCondition,
} from "../config";
import type {
  ExitConditionConfig,
  GeneratorCriticConfig,
} from "./generator-critic-agent";
import type { HierarchicalConfig, SubAgentConfig } from "./hierarchical-agent";
import type {
  ApprovalHandler,
  ApprovalRequiredConfig,
  ApprovalRequiredFn,
  HumanInLoopConfig,
} from "./human-in-loop-agent";

export type CompositeAgentConfig =
  | AgentConfig
  | GeneratorCriticConfig
  | HumanInLoopConfig
  | HierarchicalConfig;

export interface CompositeBuilder {
  sequential(
    name: string,
    agents: AgentConfig[],
    options?: SequentialOptions
  ): SequentialAgentConfig;

  parallel(
    name: string,
    agents: AgentConfig[],
    options?: ParallelOptions
  ): ParallelAgentConfig;

  coordinator(
    name: string,
    agents: (AgentConfig & { matchCondition?: string })[],
    options?: CoordinatorOptions
  ): CoordinatorAgentConfig;

  loop(
    name: string,
    agents: AgentConfig[],
    options?: LoopOptions
  ): LoopAgentConfig;

  llm(name: string, options?: LlmOptions): LlmAgentConfig;

  generatorCritic(
    name: string,
    generator: AgentConfig,
    critic: AgentConfig,
    options?: GeneratorCriticOptions
  ): GeneratorCriticConfig;

  humanInLoop(
    name: string,
    innerAgent: LlmAgentConfig,
    approvalHandler: ApprovalHandler,
    options?: HumanInLoopOptions
  ): HumanInLoopConfig;

  hierarchical(
    name: string,
    subAgents: SubAgentConfig[],
    options?: HierarchicalOptions
  ): HierarchicalConfig;
}

export interface SequentialOptions {
  description?: string;
  state?: StateConfig;
}

export interface ParallelOptions {
  description?: string;
  aggregator?: AggregatorConfig;
  state?: StateConfig;
}

export interface CoordinatorOptions {
  description?: string;
  defaultAgent?: string;
  state?: StateConfig;
}

export interface LoopOptions {
  description?: string;
  maxIterations?: number;
  stopCondition?: StopCondition;
  state?: StateConfig;
}

export interface LlmOptions {
  description?: string;
  systemPrompt?: string;
  tools?: string[];
  maxSteps?: number;
  model?: ModelConfig;
  state?: StateConfig;
}

export interface GeneratorCriticOptions {
  description?: string;
  maxIterations?: number;
  qualityThreshold?: number;
  exitCondition?: ExitConditionConfig;
  state?: StateConfig;
}

export interface HumanInLoopOptions {
  description?: string;
  approvalRequired?: ApprovalRequiredFn | ApprovalRequiredConfig;
  approvalTimeoutMs?: number;
  onApprovalTimeout?: "reject" | "skip" | "error";
  state?: StateConfig;
}

export interface HierarchicalOptions {
  description?: string;
  systemPrompt?: string;
  delegationStrategy?: "explicit" | "auto";
  maxSteps?: number;
  model?: ModelConfig;
  state?: StateConfig;
}

export const composite: CompositeBuilder = {
  sequential(
    name: string,
    agents: AgentConfig[],
    options?: SequentialOptions
  ): SequentialAgentConfig {
    return {
      type: "sequential",
      name,
      description: options?.description,
      subAgents: agents,
      state: options?.state,
    };
  },

  parallel(
    name: string,
    agents: AgentConfig[],
    options?: ParallelOptions
  ): ParallelAgentConfig {
    return {
      type: "parallel",
      name,
      description: options?.description,
      subAgents: agents,
      aggregator: options?.aggregator,
      state: options?.state,
    };
  },

  coordinator(
    name: string,
    agents: (AgentConfig & { matchCondition?: string })[],
    options?: CoordinatorOptions
  ): CoordinatorAgentConfig {
    return {
      type: "coordinator",
      name,
      description: options?.description,
      subAgents: agents,
      defaultAgent: options?.defaultAgent,
      state: options?.state,
    };
  },

  loop(
    name: string,
    agents: AgentConfig[],
    options?: LoopOptions
  ): LoopAgentConfig {
    return {
      type: "loop",
      name,
      description: options?.description,
      subAgents: agents,
      maxIterations: options?.maxIterations,
      stopCondition: options?.stopCondition,
      state: options?.state,
    };
  },

  llm(name: string, options?: LlmOptions): LlmAgentConfig {
    return {
      type: "llm",
      name,
      description: options?.description,
      systemPrompt: options?.systemPrompt,
      tools: options?.tools,
      maxSteps: options?.maxSteps,
      model: options?.model,
      state: options?.state,
    };
  },

  generatorCritic(
    name: string,
    generator: AgentConfig,
    critic: AgentConfig,
    options?: GeneratorCriticOptions
  ): GeneratorCriticConfig {
    return {
      type: "generator-critic",
      name,
      description: options?.description,
      generator,
      critic,
      maxIterations: options?.maxIterations,
      qualityThreshold: options?.qualityThreshold,
      exitCondition: options?.exitCondition,
      state: options?.state,
    };
  },

  humanInLoop(
    name: string,
    innerAgent: LlmAgentConfig,
    approvalHandler: ApprovalHandler,
    options?: HumanInLoopOptions
  ): HumanInLoopConfig {
    return {
      type: "human-in-loop",
      name,
      description: options?.description,
      innerAgent,
      approvalHandler,
      approvalRequired: options?.approvalRequired ?? { always: false },
      approvalTimeoutMs: options?.approvalTimeoutMs,
      onApprovalTimeout: options?.onApprovalTimeout,
      state: options?.state,
    };
  },

  hierarchical(
    name: string,
    subAgents: SubAgentConfig[],
    options?: HierarchicalOptions
  ): HierarchicalConfig {
    return {
      type: "hierarchical",
      name,
      description: options?.description,
      systemPrompt: options?.systemPrompt,
      subAgents,
      delegationStrategy: options?.delegationStrategy ?? "explicit",
      maxSteps: options?.maxSteps,
      model: options?.model,
      state: options?.state,
    };
  },
};

export function withStateFlow<T extends AgentConfig>(
  config: T,
  flow: { outputKey?: string; inputRefs?: string[] }
): T {
  return {
    ...config,
    state: {
      ...config.state,
      ...flow,
    },
  };
}

export function withMatchCondition<T extends AgentConfig>(
  config: T,
  condition: string
): T & { matchCondition: string } {
  return {
    ...config,
    matchCondition: condition,
  };
}

export function withDelegationDescription<T extends AgentConfig>(
  config: T,
  description: string
): SubAgentConfig {
  return {
    ...config,
    delegationDescription: description,
  } as SubAgentConfig;
}

export function createResearchPipeline(options: {
  name: string;
  searchTools: string[];
  analysisTools: string[];
  systemPrompt?: string;
}): SequentialAgentConfig {
  return composite.sequential(
    options.name,
    [
      composite.parallel(
        `${options.name}_search`,
        options.searchTools.map((tool, i) =>
          composite.llm(`searcher_${i}`, {
            tools: [tool],
            systemPrompt: "Search and gather relevant information.",
            state: { outputKey: `search_${i}` },
          })
        ),
        {
          aggregator: { strategy: "merge" },
          state: { outputKey: "search_results" },
        }
      ),
      composite.llm(`${options.name}_analyzer`, {
        tools: options.analysisTools,
        systemPrompt:
          options.systemPrompt ??
          "Analyze the search results and provide insights.",
        state: { inputRefs: ["search_results"], outputKey: "analysis" },
      }),
    ],
    { description: `Research pipeline: ${options.name}` }
  );
}

export function createValidatedGenerator(options: {
  name: string;
  generatorPrompt: string;
  validatorPrompt: string;
  generatorTools?: string[];
  validatorTools?: string[];
  maxIterations?: number;
  qualityThreshold?: number;
}): GeneratorCriticConfig {
  return composite.generatorCritic(
    options.name,
    composite.llm(`${options.name}_generator`, {
      systemPrompt: options.generatorPrompt,
      tools: options.generatorTools,
    }),
    composite.llm(`${options.name}_validator`, {
      systemPrompt: options.validatorPrompt,
      tools: options.validatorTools,
    }),
    {
      maxIterations: options.maxIterations ?? 3,
      qualityThreshold: options.qualityThreshold ?? 0.8,
      exitCondition: { type: "pass-string" },
    }
  );
}

export function createApprovalGatedAgent(options: {
  name: string;
  agent: LlmAgentConfig;
  sensitiveTools: string[];
  approvalHandler: ApprovalHandler;
  timeoutMs?: number;
}): HumanInLoopConfig {
  return composite.humanInLoop(
    options.name,
    options.agent,
    options.approvalHandler,
    {
      approvalRequired: {
        tools: options.sensitiveTools,
      },
      approvalTimeoutMs: options.timeoutMs ?? 300_000,
      onApprovalTimeout: "reject",
    }
  );
}

export function createDelegatingOrchestrator(options: {
  name: string;
  systemPrompt: string;
  specialists: Array<{
    name: string;
    description: string;
    config: AgentConfig;
  }>;
  maxSteps?: number;
}): HierarchicalConfig {
  return composite.hierarchical(
    options.name,
    options.specialists.map((spec) =>
      withDelegationDescription(spec.config, spec.description)
    ),
    {
      systemPrompt: options.systemPrompt,
      delegationStrategy: "explicit",
      maxSteps: options.maxSteps ?? 10,
    }
  );
}

export function createIntentRouter(options: {
  name: string;
  routes: Array<{
    condition: string;
    agent: AgentConfig;
  }>;
  defaultAgent?: AgentConfig;
}): CoordinatorAgentConfig {
  const agents: (AgentConfig & { matchCondition?: string })[] =
    options.routes.map((route) =>
      withMatchCondition(route.agent, route.condition)
    );

  if (options.defaultAgent) {
    agents.push(options.defaultAgent);
  }

  return composite.coordinator(options.name, agents, {
    defaultAgent: options.defaultAgent?.name,
    description: `Intent router: ${options.name}`,
  });
}

export function createEnterpriseRAG(options: {
  name: string;
  searchSources: Array<{ name: string; tool: string }>;
  answerTools: string[];
  groundingTools: string[];
  maxRefinements?: number;
}): SequentialAgentConfig {
  const generatorCriticAgent = composite.generatorCritic(
    `${options.name}_answer_generator`,
    composite.llm(`${options.name}_answerer`, {
      tools: options.answerTools,
      systemPrompt: "Generate a well-cited answer based on the search results.",
      state: { inputRefs: ["search_results"] },
    }),
    composite.llm(`${options.name}_grounding_checker`, {
      tools: options.groundingTools,
      systemPrompt:
        "Verify that the answer is properly grounded in sources. Return PASS if grounded, or feedback for improvement.",
    }),
    {
      maxIterations: options.maxRefinements ?? 2,
      exitCondition: { type: "pass-string" },
      state: { outputKey: "answer" },
    }
  );

  return composite.sequential(
    options.name,
    [
      composite.parallel(
        `${options.name}_multi_search`,
        options.searchSources.map((source) =>
          composite.llm(source.name, {
            tools: [source.tool],
            systemPrompt: `Search ${source.name} for relevant information.`,
            state: { outputKey: `search_${source.name}` },
          })
        ),
        {
          aggregator: { strategy: "merge" },
          state: { outputKey: "search_results" },
        }
      ),
      {
        type: "loop" as const,
        name: generatorCriticAgent.name,
        description: generatorCriticAgent.description,
        subAgents: [
          generatorCriticAgent.generator,
          generatorCriticAgent.critic,
        ],
        maxIterations: generatorCriticAgent.maxIterations,
        state: generatorCriticAgent.state,
      },
    ],
    { description: `Enterprise RAG: ${options.name}` }
  );
}

export function createCustomerSupportSystem(options: {
  name: string;
  knowledgeTools: string[];
  ticketTools: string[];
  escalationHandler: ApprovalHandler;
}): CoordinatorAgentConfig {
  const responseDrafter = composite.generatorCritic(
    `${options.name}_response_drafter`,
    composite.llm("response_writer", {
      systemPrompt: "Draft a helpful customer response.",
    }),
    composite.llm("tone_checker", {
      systemPrompt:
        "Check response tone and clarity. Return PASS if appropriate, or feedback.",
    }),
    { maxIterations: 3 }
  );

  const responseDrafterAsLoop: LoopAgentConfig = {
    type: "loop",
    name: responseDrafter.name,
    description: responseDrafter.description,
    subAgents: [responseDrafter.generator, responseDrafter.critic],
    maxIterations: responseDrafter.maxIterations,
    state: responseDrafter.state,
  };

  const escalationAgent = composite.llm("escalation_agent", {
    tools: ["escalate_to_manager"],
    systemPrompt: "Handle escalation with manager approval.",
  });

  return composite.coordinator(
    options.name,
    [
      withMatchCondition(
        composite.parallel(
          `${options.name}_research`,
          [
            composite.llm("knowledge_search", {
              tools: options.knowledgeTools,
              state: { outputKey: "knowledge" },
            }),
            composite.llm("ticket_search", {
              tools: options.ticketTools,
              state: { outputKey: "tickets" },
            }),
          ],
          { state: { outputKey: "research_results" } }
        ),
        "contains:question"
      ),
      withMatchCondition(responseDrafterAsLoop, "contains:respond"),
      withMatchCondition(escalationAgent, "contains:escalate"),
    ],
    { description: `Customer support system: ${options.name}` }
  );
}
