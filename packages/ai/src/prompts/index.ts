/**
 * Prompts Exports
 */

export type { TemplateCategory } from "./loader";
// Loader and builder
export {
  getTemplate,
  PromptBuilder,
  prompt,
  prompts,
  renderTemplate,
  templates,
} from "./loader";
export { default as agentPlannerTemplates } from "./templates/agent-planner";

// Individual template modules
export { default as searchQaTemplates } from "./templates/search-qa";
export { default as summarizeTemplates } from "./templates/summarize";
// Variable utilities
export {
  escapeForPrompt,
  extractVariables,
  formatDocument,
  formatKeyValues,
  formatList,
  injectVariables,
  truncateText,
  validateVariables,
} from "./variables";
