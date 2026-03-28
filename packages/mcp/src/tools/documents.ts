import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  findSimilarDocuments,
  type SimilarDocumentsParams,
  vespaClient,
} from "@openbeam/vespa";
import { z } from "zod";
import type { McpAuthContext } from "../middleware/auth";

const GetDocumentArgsSchema = z.object({
  document_id: z.string().min(1),
  include_chunks: z.boolean().default(false),
});

const RelationType = z.enum(["semantic", "entity", "graph", "all"]);

const GetRelatedArgsSchema = z.object({
  document_id: z.string().min(1),
  relation_type: RelationType.default("all"),
  limit: z.number().int().min(1).max(20).default(5),
});

export const documentTools: Tool[] = [
  {
    name: "get_document",
    description:
      "Get a document by ID with full content and metadata from Vespa",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "Document ID",
        },
        include_chunks: {
          type: "boolean",
          description: "Include document chunks if available",
          default: false,
        },
      },
      required: ["document_id"],
    },
  },
  {
    name: "get_related",
    description:
      "Find documents related to a given document by semantic similarity, shared entities, or graph links",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "Source document ID",
        },
        relation_type: {
          type: "string",
          enum: ["semantic", "entity", "graph", "all"],
          description: "Type of relation to search for",
          default: "all",
        },
        limit: {
          type: "number",
          description: "Maximum related documents to return (1-20)",
          default: 5,
        },
      },
      required: ["document_id"],
    },
  },
];

export async function handleDocumentTool(
  authContext: McpAuthContext,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (name) {
      case "get_document": {
        const parsed = GetDocumentArgsSchema.parse(args);
        const document = await vespaClient.getDocument(parsed.document_id);

        if (!document) {
          return {
            content: [{ type: "text", text: "Document not found" }],
            isError: true,
          };
        }

        if (document.team_id !== authContext.teamId) {
          return {
            content: [
              {
                type: "text",
                text: "Permission denied: document belongs to another team",
              },
            ],
            isError: true,
          };
        }

        const response: Record<string, unknown> = {
          id: document.id,
          title: document.title,
          content: document.content,
          documentType: document.document_type,
          connectorType: document.connector_type,
          author: document.author_name ?? document.author_email ?? null,
          url: document.url ?? null,
          status: document.status ?? null,
          labels: document.labels ?? [],
          createdAt: document.created_at,
          updatedAt: document.updated_at,
          metadata: document.metadata ?? null,
        };

        if (parsed.include_chunks && document.is_chunk) {
          response.chunkIndex = document.chunk_index;
          response.totalChunks = document.total_chunks;
          response.parentDocId = document.parent_doc_id;
          response.sectionTitle = document.section_title;
        }

        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      }

      case "get_related": {
        const parsed = GetRelatedArgsSchema.parse(args);
        const sourceDoc = await vespaClient.getDocument(parsed.document_id);

        if (!sourceDoc) {
          return {
            content: [{ type: "text", text: "Source document not found" }],
            isError: true,
          };
        }

        if (sourceDoc.team_id !== authContext.teamId) {
          return {
            content: [
              {
                type: "text",
                text: "Permission denied: document belongs to another team",
              },
            ],
            isError: true,
          };
        }

        const embedding = sourceDoc.embedding ?? sourceDoc.content_embedding;
        if (!embedding) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    documentId: parsed.document_id,
                    relationType: parsed.relation_type,
                    results: [],
                    reason:
                      "Source document has no embedding for similarity search",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const similarParams: SimilarDocumentsParams = {
          documentId: parsed.document_id,
          teamId: authContext.teamId,
          embedding,
          limit: parsed.limit,
          excludeIds: [parsed.document_id],
        };

        const result = await findSimilarDocuments(similarParams);

        const related = result.hits.map((hit) => {
          let relationType = "semantic";
          if (parsed.relation_type !== "all") {
            relationType = parsed.relation_type;
          } else {
            const sharedEntities = (sourceDoc.entity_ids ?? []).filter((eid) =>
              hit.document.entity_ids?.includes(eid)
            );
            if (sharedEntities.length > 0) {
              relationType = "entity";
            }
            const isLinked =
              sourceDoc.related_doc_ids?.includes(hit.id) ||
              sourceDoc.referenced_doc_ids?.includes(hit.id);
            if (isLinked) {
              relationType = "graph";
            }
          }

          return {
            id: hit.id,
            title: hit.document.title,
            snippet: (hit.document.content ?? "").slice(0, 200),
            score: hit.relevance,
            relationType,
            source: hit.document.connector_type,
            url: hit.document.url ?? null,
          };
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  documentId: parsed.document_id,
                  relationType: parsed.relation_type,
                  results: related,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown document tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}
