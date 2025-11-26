/**
 * Agent Planner
 *
 * Generates execution plans for agent tasks using LLM.
 */

import { completionService } from "../completion";
import { prompts } from "../prompts";
import type {
  AgentContext,
  AgentPlan,
  AgentStep,
  AgentTaskType,
} from "./types";

/**
 * Default plans for different task types
 */
const DEFAULT_PLANS: Record<AgentTaskType, AgentStep[]> = {
  research: [
    {
      stepId: "step-1",
      type: "search",
      description: "Search for relevant information",
    },
    {
      stepId: "step-2",
      type: "read",
      description: "Analyze top search results",
      dependencies: ["step-1"],
    },
    {
      stepId: "step-3",
      type: "reason",
      description: "Reason about findings",
      dependencies: ["step-2"],
    },
    {
      stepId: "step-4",
      type: "synthesize",
      description: "Synthesize into final answer",
      dependencies: ["step-3"],
    },
  ],
  analysis: [
    {
      stepId: "step-1",
      type: "search",
      description: "Gather data for analysis",
    },
    {
      stepId: "step-2",
      type: "read",
      description: "Read and understand data",
      dependencies: ["step-1"],
    },
    {
      stepId: "step-3",
      type: "reason",
      description: "Analyze patterns and insights",
      dependencies: ["step-2"],
    },
    {
      stepId: "step-4",
      type: "verify",
      description: "Verify analysis conclusions",
      dependencies: ["step-3"],
    },
    {
      stepId: "step-5",
      type: "synthesize",
      description: "Present analysis results",
      dependencies: ["step-4"],
    },
  ],
  action: [
    {
      stepId: "step-1",
      type: "search",
      description: "Find relevant context for action",
    },
    {
      stepId: "step-2",
      type: "verify",
      description: "Verify action is appropriate",
      dependencies: ["step-1"],
    },
    {
      stepId: "step-3",
      type: "tool",
      description: "Execute the action",
      dependencies: ["step-2"],
    },
    {
      stepId: "step-4",
      type: "synthesize",
      description: "Report action results",
      dependencies: ["step-3"],
    },
  ],
  synthesis: [
    {
      stepId: "step-1",
      type: "search",
      description: "Gather information from multiple sources",
    },
    {
      stepId: "step-2",
      type: "read",
      description: "Read all gathered information",
      dependencies: ["step-1"],
    },
    {
      stepId: "step-3",
      type: "reason",
      description: "Identify common themes and conflicts",
      dependencies: ["step-2"],
    },
    {
      stepId: "step-4",
      type: "synthesize",
      description: "Synthesize unified perspective",
      dependencies: ["step-3"],
    },
  ],
};

/**
 * Agent Planner class
 */
export class AgentPlanner {
  /**
   * Generate an execution plan for a task
   */
  async generatePlan(
    task: string,
    taskType: AgentTaskType,
    context: AgentContext
  ): Promise<AgentPlan> {
    try {
      // Build the planning prompt
      const promptBuilder = prompts.agentPlan(task, taskType);
      const messages = promptBuilder.build();

      // Generate plan using LLM
      const result = await completionService.complete(
        messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          temperature: 0.3, // Lower temperature for more consistent planning
          maxTokens: 1000,
        }
      );

      // Parse the plan from response
      const plan = this.parsePlanResponse(result.content, task, taskType);

      return plan;
    } catch (error) {
      console.error("Failed to generate plan, using default:", error);
      return this.getDefaultPlan(task, taskType);
    }
  }

  /**
   * Parse plan from LLM response
   */
  private parsePlanResponse(
    response: string,
    task: string,
    taskType: AgentTaskType
  ): AgentPlan {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        analysis?: string;
        steps?: Array<{
          stepId?: string;
          type?: string;
          description?: string;
          input?: Record<string, unknown>;
          toolId?: string;
          toolName?: string;
          dependencies?: string[];
        }>;
      };

      if (!(parsed.steps && Array.isArray(parsed.steps))) {
        throw new Error("Invalid plan format: missing steps array");
      }

      const steps: AgentStep[] = parsed.steps.map((step, index) => ({
        stepId: step.stepId || `step-${index + 1}`,
        type: this.validateStepType(step.type),
        description: step.description || `Step ${index + 1}`,
        input: step.input,
        toolId: step.toolId,
        toolName: step.toolName,
        dependencies: step.dependencies,
      }));

      return {
        analysis: parsed.analysis || `Plan for: ${task}`,
        steps,
        estimatedTokens: this.estimateTokens(steps),
        estimatedDurationMs: this.estimateDuration(steps),
      };
    } catch (error) {
      console.error("Failed to parse plan, using default:", error);
      return this.getDefaultPlan(task, taskType);
    }
  }

  /**
   * Validate step type
   */
  private validateStepType(type?: string): AgentStep["type"] {
    const validTypes = [
      "search",
      "read",
      "reason",
      "tool",
      "synthesize",
      "verify",
      "ask",
    ];

    if (type && validTypes.includes(type)) {
      return type as AgentStep["type"];
    }

    return "reason"; // Default to reason
  }

  /**
   * Get default plan for a task type
   */
  getDefaultPlan(task: string, taskType: AgentTaskType): AgentPlan {
    const steps = DEFAULT_PLANS[taskType].map((step) => ({
      ...step,
      description: step.description.replace("{task}", task.slice(0, 50)),
    }));

    return {
      analysis: `Default ${taskType} plan for: ${task.slice(0, 100)}`,
      steps,
      estimatedTokens: this.estimateTokens(steps),
      estimatedDurationMs: this.estimateDuration(steps),
    };
  }

  /**
   * Estimate token usage for a plan
   */
  private estimateTokens(steps: AgentStep[]): number {
    // Rough estimate: 1000 tokens per step on average
    return steps.length * 1000;
  }

  /**
   * Estimate duration for a plan
   */
  private estimateDuration(steps: AgentStep[]): number {
    // Rough estimate: 5 seconds per step on average
    return steps.length * 5000;
  }

  /**
   * Optimize a plan (remove redundant steps, reorder for efficiency)
   */
  optimizePlan(plan: AgentPlan): AgentPlan {
    // Remove duplicate steps
    const seen = new Set<string>();
    const optimizedSteps = plan.steps.filter((step) => {
      const key = `${step.type}-${step.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Renumber steps
    const renumberedSteps = optimizedSteps.map((step, index) => ({
      ...step,
      stepId: `step-${index + 1}`,
    }));

    return {
      ...plan,
      steps: renumberedSteps,
      estimatedTokens: this.estimateTokens(renumberedSteps),
      estimatedDurationMs: this.estimateDuration(renumberedSteps),
    };
  }
}

/**
 * Default planner instance
 */
export const agentPlanner = new AgentPlanner();

/**
 * Convenience function
 */
export async function generatePlan(
  task: string,
  taskType: AgentTaskType,
  context: AgentContext
): Promise<AgentPlan> {
  return agentPlanner.generatePlan(task, taskType, context);
}

export default agentPlanner;
