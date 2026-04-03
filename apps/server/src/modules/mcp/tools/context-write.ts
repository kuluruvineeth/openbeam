import { createHash } from "node:crypto";
import db, {
  createContextRelation,
  findContextEntry,
  upsertContextEntry,
} from "@openbeam/db";
import { z } from "zod";
import { formatContextStore } from "../formatters";
import { sanitize } from "../mcp.sanitize";
import { hasScope, type RegisterTools, WRITE_ANNOTATIONS } from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

const TRAILING_SLASHES_RE = /\/+$/;

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

function deriveParentUri(uri: string): string {
  const trimmed = uri.replace(TRAILING_SLASHES_RE, "");
  const lastSlash = trimmed.lastIndexOf("/");
  if (lastSlash <= 0) {
    return "";
  }
  return `${trimmed.slice(0, lastSlash)}/`;
}

function generateContextId(teamId: string, uri: string): string {
  return createHash("md5").update(`${teamId}:${uri}`).digest("hex");
}

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
      const parentUri = params.parentUri ?? deriveParentUri(params.uri);
      const abstractText = params.abstractText ?? params.content.slice(0, 200);
      const id = generateContextId(ctx.teamId, params.uri);

      const entry = await upsertContextEntry(db, {
        id,
        uri: params.uri,
        parentUri,
        teamId: ctx.teamId,
        ownerId: ctx.userId,
        ownerType: "user",
        contextType: params.contextType,
        category: params.category,
        isLeaf: true,
        abstractText,
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
      const sourceExists = await findContextEntry(
        db,
        ctx.teamId,
        params.sourceUri
      );
      const targetExists = await findContextEntry(
        db,
        ctx.teamId,
        params.targetUri
      );

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

      const relation = await createContextRelation(db, {
        sourceUri: params.sourceUri,
        targetUri: params.targetUri,
        teamId: ctx.teamId,
        reason: params.reason,
        relationType: params.relationType,
      });

      const text = [
        "Relation created:",
        `  ${relation.sourceUri} → ${relation.targetUri}`,
        relation.reason ? `  Reason: ${relation.reason}` : "",
        relation.relationType ? `  Type: ${relation.relationType}` : "",
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
            sourceUri: relation.sourceUri,
            targetUri: relation.targetUri,
            reason: relation.reason,
            relationType: relation.relationType,
          },
        },
      };
    }, "Failed to create context relation")
  );
};
