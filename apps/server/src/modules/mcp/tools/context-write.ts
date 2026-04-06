import { z } from "zod";
import { formatContextStore } from "../formatters";
import { sanitize } from "../mcp.sanitize";
import { getContextStore, getRelationService } from "../mcp.services";
import { hasScope, type RegisterTools, WRITE_ANNOTATIONS } from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

const mcpContextEntrySchema = z.object({
  uri: z.string(),
  title: z.string().nullable().optional(),
  abstract: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  contextType: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const registerContextWriteTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "context.write")) {
    return;
  }

  server.registerTool(
    "context_store",
    {
      title: "Store Context Entry",
      description:
        "Store a new context entry in the openbeam:// namespace. " +
        "Provide a URI, content, and context type. The system auto-generates L0 abstract from content if not provided. " +
        "Use to persist resources, skills, tool definitions, or other structured context. " +
        "For storing memories specifically, use memory_store instead — it provides a higher-level abstraction.",
      inputSchema: {
        uri: z
          .string()
          .min(1)
          .describe(
            "URI for the entry (e.g. 'openbeam://context/resources/team_1/doc_123')."
          ),
        content: z.string().min(1).describe("Full content (L2) to store."),
        contextType: z
          .enum(["resource", "memory", "skill", "tool"])
          .describe("Type of context."),
        category: z
          .string()
          .optional()
          .describe("Category within type (e.g. 'preferences', 'cases')."),
        parentUri: z
          .string()
          .optional()
          .describe(
            "Parent URI for hierarchy. Auto-derived from URI if omitted."
          ),
        abstractText: z
          .string()
          .optional()
          .describe(
            "One-sentence L0 summary. Auto-generated from first 200 chars if omitted."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const store = getContextStore();

      const entry = await store.create({
        uri: params.uri,
        parentUri: params.parentUri,
        teamId: ctx.teamId,
        ownerId: ctx.userId,
        ownerType: "user",
        contextType: params.contextType,
        category: params.category,
        isLeaf: true,
        abstractText: params.abstractText ?? params.content.slice(0, 200),
        content: params.content,
      });

      const result = {
        uri: entry.uri,
        abstract: entry.abstractText,
        contextType: entry.contextType,
        category: entry.category,
        updatedAt: entry.updatedAt.toISOString(),
      };

      const clean = sanitize(mcpContextEntrySchema, result);

      return {
        content: [{ type: "text" as const, text: formatContextStore(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to store context entry")
  );

  server.registerTool(
    "context_relate",
    {
      title: "Relate Context Entries",
      description:
        "Create a directional relation between two context entries. " +
        "Relations enable graph traversal — when reading one entry, related entries are surfaced via context_read. " +
        "Both source and target URIs must exist. Use to link memories to resources, skills to tools, etc.",
      inputSchema: {
        sourceUri: z
          .string()
          .min(1)
          .describe("URI of the source context entry."),
        targetUri: z
          .string()
          .min(1)
          .describe("URI of the target context entry."),
        reason: z
          .string()
          .optional()
          .describe("Why these entries are related."),
        relationType: z
          .string()
          .optional()
          .describe(
            "Relation type: 'references', 'derived_from', 'related_to', 'depends_on'."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const store = getContextStore();

      const [sourceExists, targetExists] = await Promise.all([
        store.read(ctx.teamId, params.sourceUri),
        store.read(ctx.teamId, params.targetUri),
      ]);

      if (!(sourceExists && targetExists)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "One or both context entries not found. Both source and target URIs must exist before creating a relation.",
            },
          ],
          isError: true,
        };
      }

      const relationService = getRelationService();
      await relationService.link(
        ctx.teamId,
        params.sourceUri,
        params.targetUri,
        params.reason
      );

      const text = [
        "Relation created:",
        `  ${params.sourceUri} → ${params.targetUri}`,
        params.reason ? `  Reason: ${params.reason}` : "",
        params.relationType ? `  Type: ${params.relationType}` : "",
        "",
        "Next steps:",
        "  Use context_read on either URI to see this relation in the related entries list.",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: {
          data: {
            sourceUri: params.sourceUri,
            targetUri: params.targetUri,
            reason: params.reason,
            relationType: params.relationType,
          },
        },
      };
    }, "Failed to create context relation")
  );
};
