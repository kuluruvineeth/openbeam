/**
 * Prompt Template Loader
 *
 * Loads and manages prompt templates for different use cases.
 */

import agentPlannerTemplates from "./templates/agent-planner";
import searchQaTemplates from "./templates/search-qa";
import summarizeTemplates from "./templates/summarize";
import { injectVariables, validateVariables } from "./variables";

/**
 * All available prompt templates organized by category
 */
export const templates = {
  searchQa: searchQaTemplates,
  summarize: summarizeTemplates,
  agent: agentPlannerTemplates,
} as const;

/**
 * Template category type
 */
export type TemplateCategory = keyof typeof templates;

/**
 * Get a template by category and name
 */
export function getTemplate(
  category: TemplateCategory,
  name: string
): string | undefined {
  const categoryTemplates = templates[category];
  return (categoryTemplates as Record<string, string>)[name];
}

/**
 * Render a template with variables
 */
export function renderTemplate(
  category: TemplateCategory,
  name: string,
  variables: Record<string, string | number | boolean | undefined>
): string {
  const template = getTemplate(category, name);
  if (!template) {
    throw new Error(`Template "${category}.${name}" not found`);
  }

  const validation = validateVariables(template, variables);
  if (!validation.valid) {
    console.warn(
      `Missing template variables: ${validation.missing.join(", ")}`
    );
  }

  return injectVariables(template, variables);
}

/**
 * Prompt builder for fluent API
 */
export class PromptBuilder {
  private systemPrompt = "";
  private userMessages: string[] = [];
  private variables: Record<string, string | number | boolean | undefined> = {};

  /**
   * Set system prompt from template
   */
  withSystemTemplate(category: TemplateCategory, name: string): PromptBuilder {
    const template = getTemplate(category, name);
    if (template) {
      this.systemPrompt = template;
    }
    return this;
  }

  /**
   * Set system prompt directly
   */
  withSystem(prompt: string): PromptBuilder {
    this.systemPrompt = prompt;
    return this;
  }

  /**
   * Add user message from template
   */
  addUserTemplate(category: TemplateCategory, name: string): PromptBuilder {
    const template = getTemplate(category, name);
    if (template) {
      this.userMessages.push(template);
    }
    return this;
  }

  /**
   * Add user message directly
   */
  addUser(message: string): PromptBuilder {
    this.userMessages.push(message);
    return this;
  }

  /**
   * Set variables for template injection
   */
  withVariables(
    vars: Record<string, string | number | boolean | undefined>
  ): PromptBuilder {
    this.variables = { ...this.variables, ...vars };
    return this;
  }

  /**
   * Set a single variable
   */
  set(
    name: string,
    value: string | number | boolean | undefined
  ): PromptBuilder {
    this.variables[name] = value;
    return this;
  }

  /**
   * Build the final system prompt
   */
  buildSystem(): string {
    return injectVariables(this.systemPrompt, this.variables);
  }

  /**
   * Build all user messages
   */
  buildUser(): string[] {
    return this.userMessages.map((msg) => injectVariables(msg, this.variables));
  }

  /**
   * Build as chat messages
   */
  build(): Array<{ role: "system" | "user"; content: string }> {
    const messages: Array<{ role: "system" | "user"; content: string }> = [];

    if (this.systemPrompt) {
      messages.push({
        role: "system",
        content: this.buildSystem(),
      });
    }

    for (const msg of this.buildUser()) {
      messages.push({
        role: "user",
        content: msg,
      });
    }

    return messages;
  }

  /**
   * Clone this builder
   */
  clone(): PromptBuilder {
    const clone = new PromptBuilder();
    clone.systemPrompt = this.systemPrompt;
    clone.userMessages = [...this.userMessages];
    clone.variables = { ...this.variables };
    return clone;
  }
}

/**
 * Create a new prompt builder
 */
export function prompt(): PromptBuilder {
  return new PromptBuilder();
}

/**
 * Quick helpers for common prompts
 */
export const prompts = {
  /**
   * Create a search Q&A prompt
   */
  searchQA(context: string, query: string): PromptBuilder {
    return prompt()
      .withSystemTemplate("searchQa", "system")
      .addUserTemplate("searchQa", "user")
      .withVariables({ context, query });
  },

  /**
   * Create a summarization prompt
   */
  summarize(
    content: string,
    style: "brief" | "detailed" | "bullets" | "executive" = "brief"
  ): PromptBuilder {
    return prompt()
      .withSystemTemplate("summarize", "system")
      .addUserTemplate("summarize", style)
      .withVariables({ content });
  },

  /**
   * Create a thread summary prompt
   */
  summarizeThread(content: string): PromptBuilder {
    return prompt()
      .withSystemTemplate("summarize", "system")
      .addUserTemplate("summarize", "thread")
      .withVariables({ content });
  },

  /**
   * Create an agent planning prompt
   */
  agentPlan(task: string, taskType: string): PromptBuilder {
    return prompt()
      .withSystemTemplate("agent", "system")
      .addUserTemplate("agent", "plan")
      .withVariables({ task, task_type: taskType });
  },

  /**
   * Create an agent reasoning prompt
   */
  agentReason(
    stepNumber: number,
    stepDescription: string,
    previousOutputs: string,
    context: string
  ): PromptBuilder {
    return prompt().addUserTemplate("agent", "reason").withVariables({
      step_number: stepNumber,
      step_description: stepDescription,
      previous_outputs: previousOutputs,
      context,
    });
  },

  /**
   * Create an agent synthesis prompt
   */
  agentSynthesize(task: string, findings: string): PromptBuilder {
    return prompt()
      .addUserTemplate("agent", "synthesize")
      .withVariables({ task, findings });
  },

  /**
   * Create a final answer prompt
   */
  agentFinalAnswer(task: string, outputs: string): PromptBuilder {
    return prompt()
      .addUserTemplate("agent", "finalAnswer")
      .withVariables({ task, outputs });
  },
};

export default prompts;
