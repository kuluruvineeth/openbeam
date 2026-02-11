import {
  type AgentStreamChunk,
  aggregateTokens,
  calculateDuration,
  completeTrace,
  type ExecutableAgent,
  failTrace,
} from "../../base";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  LlmAgentConfig,
  ParallelAgentConfig,
  SequentialAgentConfig,
} from "../../config";
import { setStateValue } from "../../config";
import type { GeneratorCriticConfig } from "../../patterns/generator-critic-agent";
import { createGeneratorCriticAgent } from "../../patterns/generator-critic-agent";
import { createSequentialAgent } from "../../patterns/sequential-agent";
import {
  CROSS_REFERENCE_PROMPT,
  ENTERPRISE_RESEARCHER_PROMPT,
  REPORT_CRITIC_PROMPT,
  REPORT_WRITER_PROMPT,
  WEB_RESEARCHER_PROMPT,
} from "./squad-prompts";

const webResearcherConfig: LlmAgentConfig = {
  type: "llm",
  name: "web-researcher",
  description: "Web research specialist using external search",
  tools: ["search_web", "scrape_page"],
  systemPrompt: WEB_RESEARCHER_PROMPT,
  maxSteps: 15,
  model: { temperature: 0.3 },
};

const enterpriseResearcherConfig: LlmAgentConfig = {
  type: "llm",
  name: "enterprise-researcher",
  description: "Enterprise knowledge specialist using internal data",
  tools: ["search_hybrid", "search_semantic", "doc_get", "doc_chunks"],
  systemPrompt: ENTERPRISE_RESEARCHER_PROMPT,
  maxSteps: 15,
  model: { temperature: 0.3 },
};

const researchGatherConfig: ParallelAgentConfig = {
  type: "parallel",
  name: "research-gather",
  description: "Parallel web and enterprise research gathering",
  subAgents: [webResearcherConfig, enterpriseResearcherConfig],
};

const crossReferenceConfig: LlmAgentConfig = {
  type: "llm",
  name: "cross-reference",
  description: "Cross-reference analyst synthesizing findings",
  tools: [],
  systemPrompt: CROSS_REFERENCE_PROMPT,
  maxSteps: 5,
  model: { temperature: 0.2 },
};

const reportWriterConfig: LlmAgentConfig = {
  type: "llm",
  name: "report-writer",
  description: "Research report writer",
  tools: [],
  systemPrompt: REPORT_WRITER_PROMPT,
  maxSteps: 5,
  model: { temperature: 0.4 },
};

const reportCriticConfig: LlmAgentConfig = {
  type: "llm",
  name: "report-critic",
  description: "Research quality critic",
  tools: [],
  systemPrompt: REPORT_CRITIC_PROMPT,
  maxSteps: 3,
  model: { temperature: 0.1 },
};

const reportGeneratorCriticConfig: GeneratorCriticConfig = {
  name: "report-refinement",
  description: "Iterative report writing with quality review",
  generator: reportWriterConfig,
  critic: reportCriticConfig,
  maxIterations: 2,
};

const gatherAndAnalyzeConfig: SequentialAgentConfig = {
  type: "sequential",
  name: "research-gather-analyze",
  description:
    "Parallel research gathering followed by cross-reference analysis",
  subAgents: [researchGatherConfig, crossReferenceConfig],
};

export const researchSquadConfig = {
  name: "research-squad",
  description:
    "Multi-agent research squad with web and enterprise search, cross-referencing, and iterative report writing",
  gatherAndAnalyze: gatherAndAnalyzeConfig,
  reportRefinement: reportGeneratorCriticConfig,
} as const;

class ResearchSquadAgent implements ExecutableAgent {
  readonly config = gatherAndAnalyzeConfig;

  private readonly gatherAndAnalyzeAgent = createSequentialAgent(
    gatherAndAnalyzeConfig
  );
  private readonly reportRefinementAgent = createGeneratorCriticAgent(
    reportGeneratorCriticConfig
  );

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = {
      agentName: "research-squad",
      type: "sequential" as const,
      startTime: Date.now(),
      status: "running" as const,
      input,
      children: [] as import("../../config").ExecutionTrace[],
    };

    try {
      const gatherResult = await this.gatherAndAnalyzeAgent.execute(input, {
        ...ctx,
        parentTrace: trace,
      });

      const reportResult = await this.reportRefinementAgent.execute(
        gatherResult.output,
        { ...ctx, parentTrace: trace }
      );

      setStateValue(
        ctx.state,
        "research-squad",
        "research-squad",
        reportResult.output
      );
      completeTrace(trace, reportResult.output);

      const tokens = aggregateTokens([trace]);
      return {
        output: reportResult.output,
        state: ctx.state,
        trace,
        finishReason: "stop",
        totalTokens: tokens,
        durationMs: calculateDuration(trace),
      };
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = {
      agentName: "research-squad",
      type: "sequential" as const,
      startTime: Date.now(),
      status: "running" as const,
      input,
      children: [] as import("../../config").ExecutionTrace[],
    };

    try {
      let gatherOutput: unknown;

      if (this.gatherAndAnalyzeAgent.stream) {
        for await (const chunk of this.gatherAndAnalyzeAgent.stream(input, {
          ...ctx,
          parentTrace: trace,
        })) {
          yield {
            ...chunk,
            agentName: `research-squad/${chunk.agentName}`,
          };

          if (chunk.type === "done" && chunk.result) {
            gatherOutput = chunk.result.output;
          }
        }
      } else {
        const result = await this.gatherAndAnalyzeAgent.execute(input, {
          ...ctx,
          parentTrace: trace,
        });
        gatherOutput = result.output;
      }

      if (this.reportRefinementAgent.stream) {
        for await (const chunk of this.reportRefinementAgent.stream(
          gatherOutput,
          { ...ctx, parentTrace: trace }
        )) {
          yield {
            ...chunk,
            agentName: `research-squad/${chunk.agentName}`,
          };
        }
      } else {
        const reportResult = await this.reportRefinementAgent.execute(
          gatherOutput,
          { ...ctx, parentTrace: trace }
        );

        setStateValue(
          ctx.state,
          "research-squad",
          "research-squad",
          reportResult.output
        );
        completeTrace(trace, reportResult.output);

        const tokens = aggregateTokens([trace]);
        yield {
          type: "done",
          agentName: "research-squad",
          result: {
            output: reportResult.output,
            state: ctx.state,
            trace,
            finishReason: "stop",
            totalTokens: tokens,
            durationMs: calculateDuration(trace),
          },
        };
      }
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }
}

export const researchSquadAgent = new ResearchSquadAgent();
