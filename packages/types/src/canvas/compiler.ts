import { z } from "zod";
import { StrictAgentCanvasEdgeSchema } from "./edges";
import { CanvasNodeTypeSchema } from "./nodes";

export const GraphPatternSchema = z.enum([
  "linear",
  "branching",
  "parallel",
  "loop",
  "complex",
]);

export type GraphPattern = z.infer<typeof GraphPatternSchema>;

export const CompiledAgentConfigSchema: z.ZodType<{
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
}> = z.object({
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

export type CompiledAgentConfig = z.infer<typeof CompiledAgentConfigSchema>;

export const CanvasValidationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  stats: z.object({
    nodes: z.number(),
    edges: z.number(),
    startNodes: z.number(),
    endNodes: z.number(),
    orphanNodes: z.number(),
    unreachableNodes: z.number(),
    cycleCount: z.number(),
  }),
});

export type CanvasValidationResult = z.infer<
  typeof CanvasValidationResultSchema
>;

export const ExecutionPlanNodeSchema = z.object({
  id: z.string(),
  type: CanvasNodeTypeSchema,
  data: z.unknown(),
  inbound: z.array(z.string()),
  outbound: z.array(z.string()),
});

export type ExecutionPlanNode = z.infer<typeof ExecutionPlanNodeSchema>;

export const ExecutionPlanSchema = z.object({
  version: z.number().int().positive(),
  startNodeId: z.string(),
  endNodeIds: z.array(z.string()),
  nodes: z.array(ExecutionPlanNodeSchema),
  edges: z.array(StrictAgentCanvasEdgeSchema),
  nodeOrder: z.array(z.string()),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
