import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const controlKnowledgeQueryTool = defineTool({
  name: "control_knowledge_query",
  description: `Query the shared team knowledge base (.team-knowledge/ directory).

USE THIS WHEN:
- Need architecture decisions, conventions, or runbooks
- Looking for team-wide standards or glossary terms
- Checking existing decision records before making new decisions
- Understanding established patterns before implementing

DO NOT USE WHEN:
- Looking for agent-specific memory (use control_memory_read instead)
- Searching enterprise documents (use search_hybrid instead)
- Need conversation context (use memory_recall instead)

RETURNS: Knowledge file content, or a listing of available knowledge files.`,
  category: "control",
  parameters: z.object({
    path: z
      .string()
      .optional()
      .describe(
        "File path within .team-knowledge/ (e.g., 'conventions', 'decisions/001-auth-strategy'). Omit to list available files."
      ),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    if (!ctx.services.controlKnowledge) {
      return failure(
        "INVALID_STATE",
        "Control knowledge service not available"
      );
    }
    const result = await ctx.services.controlKnowledge.query({
      teamId: ctx.teamId,
      path: params.path,
    });
    if (params.path && result.content === null) {
      return failure("NOT_FOUND", `Knowledge file not found: ${params.path}`);
    }
    return success(result);
  },
});

export const controlKnowledgeStoreTool = defineTool({
  name: "control_knowledge_store",
  description: `Store or update an entry in the shared team knowledge base.

USE THIS WHEN:
- Recording an architecture decision for the team
- Updating team conventions or runbooks
- Adding a glossary term or operational procedure
- Sharing a solution pattern discovered during work

DO NOT USE WHEN:
- Saving agent-specific context (use control_memory_write instead)
- The information is temporary or in-progress (use agent memory instead)

RETURNS: Confirmation that the knowledge was stored.`,
  category: "control",
  stakes: "medium",
  parameters: z.object({
    path: z
      .string()
      .min(1)
      .describe(
        "File path within .team-knowledge/ (e.g., 'conventions', 'decisions/003-caching-strategy')"
      ),
    content: z.string().min(1).describe("Markdown content to store"),
    append: z
      .boolean()
      .optional()
      .default(false)
      .describe("Append to existing file instead of overwriting"),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    await ctx.services.controlKnowledge?.store({
      teamId: ctx.teamId,
      path: params.path,
      content: params.content,
      append: params.append,
      authorAgentId: ctx.metadata?.agentId as string | undefined,
    });
    return success({
      stored: true,
      path: params.path,
    });
  },
});

export function registerKnowledgeTools() {
  controlKnowledgeQueryTool.register();
  controlKnowledgeStoreTool.register();
}
