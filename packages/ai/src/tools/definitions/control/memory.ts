import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const PARA_CATEGORIES = ["projects", "areas", "resources", "archives"] as const;

export const controlMemoryReadTool = defineTool({
  name: "control_memory_read",
  description: `Read from the agent's persistent memory using the PARA method (Projects, Areas, Resources, Archives).

USE THIS WHEN:
- Starting a new run and need to load previous context
- Checking progress on an ongoing project
- Looking up reference material or decisions
- Retrieving team conventions or debug tips

DO NOT USE WHEN:
- Looking for conversation/session memory (use memory_recall instead)
- Searching enterprise documents (use search_hybrid instead)
- Reading team knowledge shared across agents (use control_knowledge_query instead)

RETURNS: Memory file content as text, or null if the file does not exist.`,
  category: "control",
  parameters: z.object({
    category: z
      .enum(PARA_CATEGORIES)
      .describe(
        "PARA category: projects (active work), areas (ongoing responsibilities), resources (reference), archives (completed)"
      ),
    name: z
      .string()
      .min(1)
      .describe(
        "Memory file name without extension (e.g., 'auth-refactor/progress', 'code-quality')"
      ),
  }),
  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }
    const content = await ctx.services.controlMemory?.read({
      teamId: ctx.teamId,
      agentId: ctx.metadata?.agentId as string | undefined,
      category: params.category,
      name: params.name,
    });
    return success({
      found: content !== null,
      category: params.category,
      name: params.name,
      content,
    });
  },
});

export const controlMemoryWriteTool = defineTool({
  name: "control_memory_write",
  description: `Write to the agent's persistent memory using the PARA method.

USE THIS WHEN:
- Saving progress on current work before run ends
- Recording decisions or findings for future runs
- Updating project status or blockers
- Archiving completed project context

DO NOT USE WHEN:
- Storing conversation/session memory (use memory_store instead)
- Storing team-wide knowledge (use control_knowledge_store instead)
- Writing to an enterprise data source

RETURNS: Confirmation that the memory was written.`,
  category: "control",
  stakes: "low",
  parameters: z.object({
    category: z.enum(PARA_CATEGORIES).describe("PARA category to write to"),
    name: z
      .string()
      .min(1)
      .describe(
        "Memory file name without extension (e.g., 'auth-refactor/progress', 'code-quality')"
      ),
    content: z.string().min(1).describe("Markdown content to write"),
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
    await ctx.services.controlMemory?.write({
      teamId: ctx.teamId,
      agentId: ctx.metadata?.agentId as string | undefined,
      category: params.category,
      name: params.name,
      content: params.content,
      append: params.append,
    });
    return success({
      written: true,
      category: params.category,
      name: params.name,
    });
  },
});

export function registerControlMemoryTools() {
  controlMemoryReadTool.register();
  controlMemoryWriteTool.register();
}
