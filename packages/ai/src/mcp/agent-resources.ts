import type {
  MCPResourceContent,
  MCPResourceDefinition,
  MCPResourceReadResult,
  MCPResourceTemplate,
} from "@openbeam/types/ai";
import {
  defineConnectorsResource,
  defineDocumentResourceTemplate,
  defineRecentDocumentsResource,
  defineSearchResultsResourceTemplate,
  defineTeamProfileResource,
  defineUserContextResource,
  type ResourceHandler,
  type ResourceRegistry,
} from "./resources";

export interface AgentResourceServices {
  getConnectors: (teamId: string) => Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      documentCount: number;
      lastSyncAt: Date | null;
    }>
  >;
  getRecentDocuments: (
    teamId: string,
    hours: number
  ) => Promise<
    Array<{
      id: string;
      title: string;
      sourceType: string;
      updatedAt: Date;
    }>
  >;
  getTeamProfile: (teamId: string) => Promise<{
    id: string;
    name: string;
    createdAt: Date;
    memberCount: number;
    settings?: Record<string, unknown>;
  }>;
  getUserContext: (
    teamId: string,
    userId: string
  ) => Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    preferences?: Record<string, unknown>;
    permissions: string[];
  }>;
  getTeamStats: (teamId: string) => Promise<{
    documentCount: number;
    connectorCount: number;
    activeConnectors: number;
    lastSyncAt: Date | null;
    searchesLast24h: number;
    avgSearchLatencyMs: number;
  }>;
  getMemoryStats: (teamId: string) => Promise<{
    episodic: number;
    semantic: number;
    procedural: number;
    total: number;
  }>;
  getDocument: (
    documentId: string,
    teamId: string
  ) => Promise<{
    id: string;
    title: string;
    content: string;
    sourceType: string;
    sourceId: string;
    url: string | null;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
  } | null>;
  getSearchResults: (
    queryId: string,
    teamId: string
  ) => Promise<{
    query: string;
    results: Array<{
      id: string;
      title: string;
      snippet: string;
      score: number;
      sourceType: string;
    }>;
    totalCount: number;
    executedAt: Date;
  } | null>;
  getConnectorDetails: (
    connectorId: string,
    teamId: string
  ) => Promise<{
    id: string;
    name: string;
    type: string;
    status: string;
    documentCount: number;
    lastSyncAt: Date | null;
    createdAt: Date;
    configuration: Record<string, unknown>;
    syncSchedule: string | null;
    errorCount: number;
  } | null>;
  getConnectorHistory: (
    connectorId: string,
    teamId: string,
    limit?: number
  ) => Promise<
    Array<{
      id: string;
      status: string;
      startedAt: Date;
      completedAt: Date | null;
      documentsProcessed: number;
      documentsAdded: number;
      documentsUpdated: number;
      documentsDeleted: number;
      errorMessage: string | null;
    }>
  >;
}

export function defineTeamStatsResource(): MCPResourceDefinition {
  return {
    uri: "openbeam://team/stats",
    name: "Team Statistics",
    description: "Current team usage statistics and metrics",
    mimeType: "application/json",
  };
}

export function defineMemoryStatsResource(): MCPResourceDefinition {
  return {
    uri: "openbeam://memory/stats",
    name: "Memory Statistics",
    description:
      "Agent memory store statistics (episodic, semantic, procedural)",
    mimeType: "application/json",
  };
}

export function defineConnectorResourceTemplate(): MCPResourceTemplate {
  return {
    uriTemplate: "openbeam://connectors/{connectorId}",
    name: "Connector Details",
    description: "Detailed information about a specific connector",
    mimeType: "application/json",
  };
}

export function defineConnectorSyncHistoryTemplate(): MCPResourceTemplate {
  return {
    uriTemplate: "openbeam://connectors/{connectorId}/history",
    name: "Connector Sync History",
    description: "Recent sync history for a specific connector",
    mimeType: "application/json",
  };
}

function createResourceContent(
  uri: string,
  data: unknown,
  mimeType = "application/json"
): MCPResourceContent {
  return {
    type: "resource",
    uri,
    text: JSON.stringify(data, null, 2),
    mimeType,
  };
}

function makeResourceResult(uri: string, data: unknown): MCPResourceReadResult {
  return {
    contents: [createResourceContent(uri, data)],
  };
}

export function createConnectorsHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return {
        contents: [
          createResourceContent(uri, {
            error: "Team ID required",
            connectors: [],
          }),
        ],
      };
    }

    const connectors = await services.getConnectors(context.teamId);

    return makeResourceResult(uri, {
      connectors: connectors.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        documentCount: c.documentCount,
        lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
      })),
      count: connectors.length,
      activeCount: connectors.filter((c) => c.status === "active").length,
    });
  };
}

export function createRecentDocumentsHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, {
        error: "Team ID required",
        documents: [],
      });
    }

    const documents = await services.getRecentDocuments(context.teamId, 24);

    return makeResourceResult(uri, {
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        sourceType: d.sourceType,
        updatedAt: d.updatedAt.toISOString(),
      })),
      count: documents.length,
      periodHours: 24,
    });
  };
}

export function createTeamProfileHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, { error: "Team ID required" });
    }

    const profile = await services.getTeamProfile(context.teamId);

    return makeResourceResult(uri, {
      id: profile.id,
      name: profile.name,
      createdAt: profile.createdAt.toISOString(),
      memberCount: profile.memberCount,
      settings: profile.settings ?? {},
    });
  };
}

export function createUserContextHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!(context.teamId && context.userId)) {
      return makeResourceResult(uri, {
        error: "Team ID and User ID required",
      });
    }

    const userContext = await services.getUserContext(
      context.teamId,
      context.userId
    );

    return makeResourceResult(uri, {
      id: userContext.id,
      name: userContext.name,
      email: userContext.email,
      role: userContext.role,
      preferences: userContext.preferences ?? {},
      permissions: userContext.permissions,
    });
  };
}

export function createTeamStatsHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, { error: "Team ID required" });
    }

    const stats = await services.getTeamStats(context.teamId);

    return makeResourceResult(uri, {
      documentCount: stats.documentCount,
      connectorCount: stats.connectorCount,
      activeConnectors: stats.activeConnectors,
      lastSyncAt: stats.lastSyncAt?.toISOString() ?? null,
      usage: {
        searchesLast24h: stats.searchesLast24h,
        avgSearchLatencyMs: stats.avgSearchLatencyMs,
      },
    });
  };
}

export function createMemoryStatsHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, { error: "Team ID required" });
    }

    const stats = await services.getMemoryStats(context.teamId);

    return makeResourceResult(uri, {
      episodic: stats.episodic,
      semantic: stats.semantic,
      procedural: stats.procedural,
      total: stats.total,
      breakdown: {
        episodicPercent:
          stats.total > 0
            ? Math.round((stats.episodic / stats.total) * 100)
            : 0,
        semanticPercent:
          stats.total > 0
            ? Math.round((stats.semantic / stats.total) * 100)
            : 0,
        proceduralPercent:
          stats.total > 0
            ? Math.round((stats.procedural / stats.total) * 100)
            : 0,
      },
    });
  };
}

export function createDocumentHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, { error: "Team ID required" });
    }

    const documentId = extractDocumentId(uri);
    if (!documentId) {
      return makeResourceResult(uri, { error: "Invalid document URI" });
    }

    const document = await services.getDocument(documentId, context.teamId);
    if (!document) {
      return makeResourceResult(uri, { error: "Document not found" });
    }

    return makeResourceResult(uri, {
      id: document.id,
      title: document.title,
      content: document.content,
      sourceType: document.sourceType,
      sourceId: document.sourceId,
      url: document.url,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      metadata: document.metadata,
    });
  };
}

export function createSearchResultsHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, { error: "Team ID required" });
    }

    const queryId = extractQueryId(uri);
    if (!queryId) {
      return makeResourceResult(uri, { error: "Invalid search results URI" });
    }

    const results = await services.getSearchResults(queryId, context.teamId);
    if (!results) {
      return makeResourceResult(uri, {
        error: "Search results not found or expired",
      });
    }

    return makeResourceResult(uri, {
      query: results.query,
      results: results.results.map((r) => ({
        id: r.id,
        title: r.title,
        snippet: r.snippet,
        score: r.score,
        sourceType: r.sourceType,
      })),
      totalCount: results.totalCount,
      executedAt: results.executedAt.toISOString(),
    });
  };
}

export function createConnectorDetailsHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, { error: "Team ID required" });
    }

    const connectorId = extractConnectorId(uri);
    if (!connectorId) {
      return makeResourceResult(uri, { error: "Invalid connector URI" });
    }

    const connector = await services.getConnectorDetails(
      connectorId,
      context.teamId
    );
    if (!connector) {
      return makeResourceResult(uri, { error: "Connector not found" });
    }

    return makeResourceResult(uri, {
      id: connector.id,
      name: connector.name,
      type: connector.type,
      status: connector.status,
      documentCount: connector.documentCount,
      lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
      createdAt: connector.createdAt.toISOString(),
      configuration: connector.configuration,
      syncSchedule: connector.syncSchedule,
      errorCount: connector.errorCount,
    });
  };
}

export function createConnectorHistoryHandler(
  services: AgentResourceServices
): ResourceHandler {
  return async (uri, context) => {
    if (!context.teamId) {
      return makeResourceResult(uri, { error: "Team ID required" });
    }

    const connectorId = extractConnectorIdFromHistory(uri);
    if (!connectorId) {
      return makeResourceResult(uri, {
        error: "Invalid connector history URI",
      });
    }

    const history = await services.getConnectorHistory(
      connectorId,
      context.teamId,
      20
    );

    return makeResourceResult(uri, {
      connectorId,
      history: history.map((h) => ({
        id: h.id,
        status: h.status,
        startedAt: h.startedAt.toISOString(),
        completedAt: h.completedAt?.toISOString() ?? null,
        documentsProcessed: h.documentsProcessed,
        documentsAdded: h.documentsAdded,
        documentsUpdated: h.documentsUpdated,
        documentsDeleted: h.documentsDeleted,
        errorMessage: h.errorMessage,
      })),
      count: history.length,
    });
  };
}

const DOCUMENT_URI_REGEX = /^openbeam:\/\/documents\/([^/]+)$/;
const SEARCH_URI_REGEX = /^openbeam:\/\/search\/([^/]+)$/;
const CONNECTOR_URI_REGEX = /^openbeam:\/\/connectors\/([^/]+)$/;
const CONNECTOR_HISTORY_URI_REGEX =
  /^openbeam:\/\/connectors\/([^/]+)\/history$/;

function extractDocumentId(uri: string): string | null {
  const match = uri.match(DOCUMENT_URI_REGEX);
  return match?.[1] ?? null;
}

function extractQueryId(uri: string): string | null {
  const match = uri.match(SEARCH_URI_REGEX);
  return match?.[1] ?? null;
}

function extractConnectorId(uri: string): string | null {
  const match = uri.match(CONNECTOR_URI_REGEX);
  return match?.[1] ?? null;
}

function extractConnectorIdFromHistory(uri: string): string | null {
  const match = uri.match(CONNECTOR_HISTORY_URI_REGEX);
  return match?.[1] ?? null;
}

export interface RegisterAgentResourcesOptions {
  registry: ResourceRegistry;
  services: AgentResourceServices;
}

export function registerAgentResources(
  options: RegisterAgentResourcesOptions
): void {
  const { registry, services } = options;

  registry.register(
    defineConnectorsResource(),
    createConnectorsHandler(services)
  );

  registry.register(
    defineRecentDocumentsResource(),
    createRecentDocumentsHandler(services)
  );

  registry.register(
    defineTeamProfileResource(),
    createTeamProfileHandler(services)
  );

  registry.register(
    defineUserContextResource(),
    createUserContextHandler(services)
  );

  registry.register(
    defineTeamStatsResource(),
    createTeamStatsHandler(services)
  );

  registry.register(
    defineMemoryStatsResource(),
    createMemoryStatsHandler(services)
  );

  registry.registerTemplate(
    defineDocumentResourceTemplate(),
    createDocumentHandler(services)
  );

  registry.registerTemplate(
    defineSearchResultsResourceTemplate(),
    createSearchResultsHandler(services)
  );

  registry.registerTemplate(
    defineConnectorResourceTemplate(),
    createConnectorDetailsHandler(services)
  );

  registry.registerTemplate(
    defineConnectorSyncHistoryTemplate(),
    createConnectorHistoryHandler(services)
  );
}

export function getAgentResourceDefinitions(): MCPResourceDefinition[] {
  return [
    defineConnectorsResource(),
    defineRecentDocumentsResource(),
    defineTeamProfileResource(),
    defineUserContextResource(),
    defineTeamStatsResource(),
    defineMemoryStatsResource(),
  ];
}

export function getAgentResourceTemplates(): MCPResourceTemplate[] {
  return [
    defineDocumentResourceTemplate(),
    defineSearchResultsResourceTemplate(),
    defineConnectorResourceTemplate(),
    defineConnectorSyncHistoryTemplate(),
  ];
}

export function createMockAgentResourceServices(): AgentResourceServices {
  return {
    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getConnectors() {
      return [
        {
          id: "conn_1",
          name: "Slack",
          type: "slack",
          status: "active",
          documentCount: 1500,
          lastSyncAt: new Date(),
        },
        {
          id: "conn_2",
          name: "Notion",
          type: "notion",
          status: "active",
          documentCount: 850,
          lastSyncAt: new Date(Date.now() - 3_600_000),
        },
      ];
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getRecentDocuments() {
      return [
        {
          id: "doc_1",
          title: "Q4 Planning Document",
          sourceType: "notion",
          updatedAt: new Date(),
        },
        {
          id: "doc_2",
          title: "Engineering Standup Notes",
          sourceType: "slack",
          updatedAt: new Date(Date.now() - 7_200_000),
        },
      ];
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getTeamProfile(teamId) {
      return {
        id: teamId,
        name: "Engineering Team",
        createdAt: new Date("2024-01-01"),
        memberCount: 12,
        settings: {},
      };
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getUserContext(_teamId, userId) {
      return {
        id: userId,
        name: "Test User",
        email: "test@example.com",
        role: "admin",
        preferences: { responseStyle: "concise" },
        permissions: ["read", "write", "admin"],
      };
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getTeamStats() {
      return {
        documentCount: 2350,
        connectorCount: 4,
        activeConnectors: 3,
        lastSyncAt: new Date(),
        searchesLast24h: 156,
        avgSearchLatencyMs: 85,
      };
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getMemoryStats() {
      return {
        episodic: 450,
        semantic: 120,
        procedural: 35,
        total: 605,
      };
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getDocument(documentId) {
      if (documentId === "not_found") {
        return null;
      }
      return {
        id: documentId,
        title: "Test Document",
        content: "This is the document content for testing purposes.",
        sourceType: "notion",
        sourceId: "notion_page_123",
        url: "https://notion.so/test-doc",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date(),
        metadata: { author: "Test User", tags: ["engineering", "planning"] },
      };
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getSearchResults(queryId) {
      if (queryId === "not_found") {
        return null;
      }
      return {
        query: "test query",
        results: [
          {
            id: "doc_1",
            title: "Result Document 1",
            snippet: "This is a relevant snippet from the document...",
            score: 0.95,
            sourceType: "notion",
          },
          {
            id: "doc_2",
            title: "Result Document 2",
            snippet: "Another relevant snippet with matching content...",
            score: 0.87,
            sourceType: "slack",
          },
        ],
        totalCount: 2,
        executedAt: new Date(),
      };
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getConnectorDetails(connectorId) {
      if (connectorId === "not_found") {
        return null;
      }
      return {
        id: connectorId,
        name: "Test Connector",
        type: "slack",
        status: "active",
        documentCount: 1500,
        lastSyncAt: new Date(),
        createdAt: new Date("2024-01-01"),
        configuration: {
          workspace: "engineering",
          channels: ["general", "dev"],
        },
        syncSchedule: "0 */6 * * *",
        errorCount: 0,
      };
    },

    // biome-ignore lint/suspicious/useAwait: mock returns static data
    async getConnectorHistory(connectorId) {
      if (connectorId === "empty_history") {
        return [];
      }
      return [
        {
          id: "sync_1",
          status: "completed",
          startedAt: new Date(Date.now() - 3_600_000),
          completedAt: new Date(Date.now() - 3_540_000),
          documentsProcessed: 150,
          documentsAdded: 10,
          documentsUpdated: 5,
          documentsDeleted: 2,
          errorMessage: null,
        },
        {
          id: "sync_2",
          status: "completed",
          startedAt: new Date(Date.now() - 7_200_000),
          completedAt: new Date(Date.now() - 7_140_000),
          documentsProcessed: 145,
          documentsAdded: 8,
          documentsUpdated: 3,
          documentsDeleted: 0,
          errorMessage: null,
        },
      ];
    },
  };
}
