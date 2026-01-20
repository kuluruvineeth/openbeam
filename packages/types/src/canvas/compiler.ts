import { z } from "zod";

export const GraphPatternSchema = z.enum([
  "linear",
  "branching",
  "parallel",
  "loop",
  "complex",
]);

export type GraphPattern = z.infer<typeof GraphPatternSchema>;

export interface CompiledAgentConfig {
  name: string;
  description?: string;
  pattern:
    | "llm"
    | "sequential"
    | "parallel"
    | "coordinator"
    | "loop"
    | "generator-critic"
    | "hierarchical";
  tools: string[];
  systemPrompt?: string;
  maxSteps?: number;
  subAgents?: CompiledAgentConfig[];
  loopConfig?: {
    maxIterations: number;
    stopCondition: string;
  };
  coordinatorConfig?: {
    routes: Array<{
      condition: string;
      agentName: string;
    }>;
  };
}

export const CompiledAgentConfigSchema: z.ZodType<CompiledAgentConfig> =
  z.object({
    name: z.string(),
    description: z.string().optional(),
    pattern: z.enum([
      "llm",
      "sequential",
      "parallel",
      "coordinator",
      "loop",
      "generator-critic",
      "hierarchical",
    ]),
    tools: z.array(z.string()),
    systemPrompt: z.string().optional(),
    maxSteps: z.number().optional(),
    subAgents: z.lazy(() => z.array(CompiledAgentConfigSchema)).optional(),
    loopConfig: z
      .object({
        maxIterations: z.number(),
        stopCondition: z.string(),
      })
      .optional(),
    coordinatorConfig: z
      .object({
        routes: z.array(
          z.object({
            condition: z.string(),
            agentName: z.string(),
          })
        ),
      })
      .optional(),
  });
