import db, { listTopicClusters } from "@openbeam/db";
import {
  getExpertsForTopicForTeam,
  getKnowledgePanelForTeam,
  getKnowledgeRelationsForTeam,
  getPersonExpertiseForTeam,
  searchKnowledgeEntitiesForTeam,
} from "@openbeam/services";
import { z } from "zod";
import {
  formatEntityPanel,
  formatEntityRelations,
  formatEntitySearch,
  formatPersonExpertise,
  formatTopicExperts,
  formatTopicList,
} from "../formatters/knowledge";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

const ENTITY_TYPES = [
  "PERSON",
  "TEAM",
  "PROJECT",
  "TOPIC",
  "TECHNOLOGY",
  "LOCATION",
  "ORGANIZATION",
  "CHANNEL",
  "REPOSITORY",
  "CUSTOMER",
  "PRODUCT",
  "EVENT",
  "TICKET",
] as const;

const RELATION_TYPES = [
  "MEMBER_OF",
  "REPORTS_TO",
  "COLLABORATES_WITH",
  "MENTIONS",
  "EXPERT_IN",
  "AUTHORED",
  "MAINTAINS",
  "OWNS",
  "USES",
  "RELATES_TO",
  "CHILD_OF",
  "WORKS_ON",
  "ASSIGNED_TO",
] as const;

const mcpEntitySchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  aliases: z.array(z.string()).nullable().optional(),
  expertiseScore: z.number().nullable().optional(),
  mentionCount: z.number().nullable().optional(),
});

const mcpRelationSchema = z.object({
  id: z.string(),
  relationType: z.string(),
  weight: z.number().nullable().optional(),
  fromEntity: mcpEntitySchema.nullable().optional(),
  toEntity: mcpEntitySchema.nullable().optional(),
});

const mcpExpertiseSchema = z.object({
  topic: mcpEntitySchema,
  score: z.number().nullable().optional(),
});

const mcpExpertSchema = z.object({
  person: mcpEntitySchema,
  score: z.number().nullable().optional(),
});

const mcpMentionSchema = z.object({
  id: z.string(),
  documentId: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

const mcpTopicClusterSchema: z.ZodType<{
  id: string;
  name: string;
  documentCount: number | null;
  children?: unknown[];
}> = z.object({
  id: z.string(),
  name: z.string(),
  documentCount: z.number().nullable(),
  children: z.lazy(() => z.array(mcpTopicClusterSchema)).optional(),
});

export const registerKnowledgeTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "search.read")) {
    return;
  }

  server.registerTool(
    "entity_search",
    {
      title: "Search Knowledge Graph Entities",
      description:
        "Search the organizational knowledge graph for people, topics, projects, teams, and technologies by name. Use this FIRST — before search_documents — when the user asks 'who is the expert on X?', 'who knows about X?', 'who should I talk to about X?', or 'what does [person] work on?'. This is the entry point for all expertise and organizational structure questions.\n\nUse this when the user asks about expertise, people, team structure, topics, or organizational knowledge. Use this FIRST before topic_experts or person_expertise to discover the entity ID you need. The typical chain: entity_search → topic_experts (for 'who knows about X?') or entity_search → person_expertise (for 'what does person know?').\n\nReturns each entity's ID (required by topic_experts, person_expertise, entity_get, entity_relations), name, type, aliases, mention count, and expertise score. Supports 13 entity types: PERSON, TEAM, PROJECT, TOPIC, TECHNOLOGY, LOCATION, ORGANIZATION, CHANNEL, REPOSITORY, CUSTOMER, PRODUCT, EVENT, TICKET.\n\nAfter finding a TOPIC entity, use topic_experts with its ID to get ranked experts. After finding a PERSON entity, use person_expertise with its ID to see their skills. Use entity_get for the full knowledge panel with relationships and mentions.\n\nDo NOT use search_documents for 'who is the expert?' or 'who knows about?' questions — this tool combined with topic_experts is purpose-built for that and returns ranked expertise scores.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Search query — matches entity names and aliases"),
        type: z
          .enum(ENTITY_TYPES)
          .optional()
          .describe(
            "Filter by entity type. Omit to search all types. Common: PERSON, PROJECT, TOPIC, TECHNOLOGY"
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .default(20)
          .describe("Maximum results to return (default 20, max 50)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const result = await searchKnowledgeEntitiesForTeam(db, {
        teamId: ctx.teamId,
        query: params.query,
        type: params.type,
        limit: params.limit,
      });

      const clean = sanitizeArray(mcpEntitySchema, result.items);

      return {
        content: [
          {
            type: "text" as const,
            text: formatEntitySearch(params.query, clean),
          },
        ],
        structuredContent: { data: clean },
      };
    }, "Failed to search entities")
  );

  server.registerTool(
    "entity_get",
    {
      title: "Get Entity Knowledge Panel",
      description:
        "Get the full knowledge panel for a single entity, including its details, all relationships (both incoming and outgoing), expertise areas (for PERSON entities), and recent document mentions. Use this after entity_search to drill into a specific entity, or when you already have an entity ID from another tool.\n\nThe knowledge panel aggregates everything known about an entity in one call: type, aliases, mention count, expertise score, up to 50 outgoing and 50 incoming relationships, up to 5 expertise topics (for people), and up to 5 recent document mentions.\n\nTo explore relationships in more detail with direction and type filters, use entity_relations. To find all experts on a specific topic, use topic_experts. To see a person's full expertise profile, use person_expertise.",
      inputSchema: {
        entityId: z
          .string()
          .min(1)
          .describe(
            "The entity ID — obtain from entity_search results or entity_relations"
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const panel = await getKnowledgePanelForTeam(db, {
        teamId: ctx.teamId,
        entityId: params.entityId,
      });

      const entity = sanitize(mcpEntitySchema, panel.entity);
      const outgoing = sanitizeArray(
        mcpRelationSchema,
        panel.relations.outgoing
      );
      const incoming = sanitizeArray(
        mcpRelationSchema,
        panel.relations.incoming
      );
      const expertise = sanitizeArray(mcpExpertiseSchema, panel.expertise);
      const mentions = sanitizeArray(
        mcpMentionSchema,
        panel.recentMentions.map((m: Record<string, unknown>) => ({
          id: m.id,
          documentId: m.documentId,
          createdAt:
            m.createdAt instanceof Date
              ? m.createdAt.toISOString()
              : String(m.createdAt ?? ""),
        }))
      );

      const cleanPanel = {
        entity,
        relations: { outgoing, incoming },
        expertise,
        recentMentions: mentions,
      };

      return {
        content: [
          { type: "text" as const, text: formatEntityPanel(cleanPanel) },
        ],
        structuredContent: { data: cleanPanel },
      };
    }, "Failed to get entity panel")
  );

  server.registerTool(
    "entity_relations",
    {
      title: "Get Entity Relationships",
      description:
        "Get relationships for a specific entity, with optional filtering by direction and relation type. Use this when you need to explore how an entity connects to others — who reports to whom, which teams a person belongs to, what technologies a project uses, etc.\n\nReturns outgoing relationships (this entity -> other) and incoming relationships (other -> this entity), each with the relation type, weight score, and the connected entity's details. Supports 13 relation types: MEMBER_OF, REPORTS_TO, COLLABORATES_WITH, MENTIONS, EXPERT_IN, AUTHORED, MAINTAINS, OWNS, USES, RELATES_TO, CHILD_OF, WORKS_ON, ASSIGNED_TO.\n\nFor a complete entity overview including expertise and mentions alongside relations, use entity_get instead. To find all experts on a topic, use topic_experts. To map a person's expertise areas, use person_expertise.",
      inputSchema: {
        entityId: z
          .string()
          .min(1)
          .describe("The entity ID to get relationships for"),
        direction: z
          .enum(["incoming", "outgoing", "both"])
          .optional()
          .default("both")
          .describe(
            "Filter direction: 'outgoing' = from this entity, 'incoming' = to this entity, 'both' = all (default: both)"
          ),
        relationType: z
          .enum(RELATION_TYPES)
          .optional()
          .describe(
            "Filter by relation type. Omit to return all types. Common: MEMBER_OF, EXPERT_IN, WORKS_ON, REPORTS_TO"
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(50)
          .describe("Maximum relations per direction (default 50, max 100)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const result = await getKnowledgeRelationsForTeam(db, {
        teamId: ctx.teamId,
        entityId: params.entityId,
        direction: params.direction,
      });

      const outgoing = sanitizeArray(mcpRelationSchema, result.outgoing);
      const incoming = sanitizeArray(mcpRelationSchema, result.incoming);

      return {
        content: [
          {
            type: "text" as const,
            text: formatEntityRelations(params.entityId, outgoing, incoming),
          },
        ],
        structuredContent: { data: { outgoing, incoming } },
      };
    }, "Failed to get entity relations")
  );

  server.registerTool(
    "topic_experts",
    {
      title: "Find Topic Experts",
      description:
        "Find the ranked experts on a specific topic. This is the second step after entity_search: first find the TOPIC entity with entity_search, then pass its ID here to get the people who know most about it.\n\nUse this when the user asks 'who is the expert on X?', 'who knows about X?', 'who should I talk to about X?', or 'find someone who can help with X'. Always call entity_search with type TOPIC first to get the topicId — do not guess IDs.\n\nReturns a ranked list of people with their name, entity ID, expertise weight score (0-1, higher = stronger expertise), mention count, and overall expertise score. Ordered by strongest expertise first. The score reflects document authorship, mention patterns, and collaboration signals.\n\nAfter finding experts, use person_expertise with a person's ID to see all their expertise areas, entity_get for their full knowledge panel, or search_documents with their name to find their authored content.\n\nDo NOT skip this tool and use search_documents to answer 'who is the expert?' questions — this returns ranked expertise scores derived from the knowledge graph, which is more accurate than document search.",
      inputSchema: {
        topicId: z
          .string()
          .min(1)
          .describe(
            "The ID of a TOPIC entity — find via entity_search with type: TOPIC"
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum experts to return (default 10, max 50)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const result = await getExpertsForTopicForTeam(db, {
        teamId: ctx.teamId,
        topicId: params.topicId,
        limit: params.limit,
      });

      const clean = sanitizeArray(mcpExpertSchema, result.experts);

      return {
        content: [
          {
            type: "text" as const,
            text: formatTopicExperts(params.topicId, clean),
          },
        ],
        structuredContent: { data: clean },
      };
    }, "Failed to find topic experts")
  );

  server.registerTool(
    "person_expertise",
    {
      title: "Get Person Expertise",
      description:
        "Get a person's areas of expertise ranked by score. This is the second step after entity_search: first find the PERSON entity with entity_search, then pass their ID here to see what they know.\n\nUse this when the user asks 'what does [person] work on?', 'what are [person]'s skills?', 'what is [person] an expert in?', or 'tell me about [person]'s expertise'. Always call entity_search with type PERSON first to get the personId — do not guess IDs.\n\nReturns a ranked list of topics with each topic's name, entity ID, and expertise weight score (0-1, higher = stronger). Derived from document authorship, mention patterns, and collaboration signals across all connected sources.\n\nAfter seeing expertise areas, use topic_experts with a topic ID to find other experts on the same topic, entity_get for the person's full knowledge panel, or search_documents with the person's name to find their authored content.\n\nDo NOT use search_documents to answer 'what does person work on?' — this tool returns structured expertise data from the knowledge graph.",
      inputSchema: {
        personId: z
          .string()
          .min(1)
          .describe(
            "The ID of a PERSON entity — find via entity_search with type: PERSON"
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum expertise areas to return (default 10, max 50)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const result = await getPersonExpertiseForTeam(db, {
        teamId: ctx.teamId,
        personId: params.personId,
        limit: params.limit,
      });

      const clean = sanitizeArray(mcpExpertiseSchema, result.expertise);

      return {
        content: [
          {
            type: "text" as const,
            text: formatPersonExpertise(params.personId, clean),
          },
        ],
        structuredContent: { data: clean },
      };
    }, "Failed to get person expertise")
  );

  server.registerTool(
    "topic_list",
    {
      title: "Browse Topic Clusters",
      description:
        "Browse the hierarchical topic cluster tree. Topics are automatically generated from synced documents and organized into a hierarchy. Use this to explore what topics exist in the knowledge graph, understand the organizational knowledge landscape, or navigate to specific subtopics.\n\nCall with no parentId to get root-level topic clusters. Pass a cluster's ID as parentId to browse its subtopics. Each cluster includes its name, document count, and immediate children. Clusters are ordered by document count (most documents first).\n\nAfter finding an interesting topic cluster, use entity_search with the topic name to find the corresponding TOPIC entity. Then use topic_experts to find people who know about it, or search_documents with the topic name to find related content.",
      inputSchema: {
        parentId: z
          .string()
          .optional()
          .describe(
            "Parent cluster ID to browse children of. Omit for root-level topics"
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(20)
          .describe("Maximum clusters to return (default 20, max 100)"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const clusters = await listTopicClusters(db, ctx.teamId, params.parentId);

      const limited = clusters.slice(0, params.limit);
      const clean = sanitizeArray(mcpTopicClusterSchema, limited) as {
        id: string;
        name: string;
        documentCount: number | null;
        children?: unknown[];
      }[];

      return {
        content: [{ type: "text" as const, text: formatTopicList(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to list topic clusters")
  );
};
