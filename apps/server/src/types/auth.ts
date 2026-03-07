export const API_SCOPES = {
  CONNECTORS_READ: "connectors:read",
  CONNECTORS_WRITE: "connectors:write",
  CONNECTORS_SYNC: "connectors:sync",

  SEARCH_READ: "search:read",
  ANALYTICS_READ: "analytics:read",
  TEAMS_READ: "teams:read",
  TEAMS_WRITE: "teams:write",
  APPS_READ: "apps:read",
  APPS_WRITE: "apps:write",
  RAG_READ: "rag:read",
  RAG_WRITE: "rag:write",
  KNOWLEDGE_READ: "knowledge:read",
  PERMISSIONS_READ: "permissions:read",
  PERMISSIONS_WRITE: "permissions:write",
  MEDIA_READ: "media:read",
  MEDIA_WRITE: "media:write",
  AGENTS_READ: "agents:read",
  AGENTS_WRITE: "agents:write",
  CANVAS_READ: "canvas:read",
  CANVAS_WRITE: "canvas:write",
  CANVAS_EXECUTE: "canvas:execute",
  RESEARCH_READ: "research:read",
  RESEARCH_WRITE: "research:write",
  CONTROL_READ: "control:read",
  CONTROL_WRITE: "control:write",
  CONTROL_EXECUTE: "control:execute",
  ADMIN_ALL: "admin:*",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

export type AuthContext =
  | {
      type: "session";
      userId: string;
      teamId: string | null;
      email?: string;
    }
  | {
      type: "apiKey";
      apiKeyId: string;
      teamId: string;
      scopes: string[];
    }
  | {
      type: "agent";
      agentId: string;
      teamId: string;
    }
  | {
      type: "none";
    };

export function hasRequiredScopes(
  context: AuthContext,
  requiredScopes: string[]
): boolean {
  if (context.type === "session") {
    return true;
  }

  if (context.type === "agent") {
    return requiredScopes.every(
      (s) =>
        s.startsWith("control:") ||
        s === API_SCOPES.CONNECTORS_READ ||
        s === API_SCOPES.SEARCH_READ
    );
  }

  if (context.type === "apiKey") {
    if (context.scopes.includes(API_SCOPES.ADMIN_ALL)) {
      return true;
    }

    return requiredScopes.every((required) =>
      context.scopes.includes(required)
    );
  }

  return false;
}

export function getTeamId(context: AuthContext): string | null {
  if (context.type === "session") {
    return context.teamId;
  }
  if (context.type === "apiKey" || context.type === "agent") {
    return context.teamId;
  }
  return null;
}

export function getOrganizationId(context: AuthContext): string | null {
  return getTeamId(context);
}

export function getAccessControlIds(context: AuthContext): string[] {
  const identifiers = new Set<string>();

  if (context.type === "session") {
    identifiers.add(context.userId);
    if (context.email) {
      identifiers.add(context.email);
    }
    if (context.teamId) {
      identifiers.add(`team:${context.teamId}`);
    }
  }

  if (context.type === "apiKey") {
    identifiers.add(`team:${context.teamId}`);
  }

  if (context.type === "agent") {
    identifiers.add(`agent:${context.agentId}`);
    identifiers.add(`team:${context.teamId}`);
  }

  return Array.from(identifiers);
}

export const SCOPE_METHOD_MAP: Record<string, string[]> = {
  [API_SCOPES.CONNECTORS_READ]: ["GET"],
  [API_SCOPES.CONNECTORS_WRITE]: ["POST", "PUT", "PATCH", "DELETE"],
  [API_SCOPES.CONNECTORS_SYNC]: ["POST"],
  [API_SCOPES.SEARCH_READ]: ["GET"],
  [API_SCOPES.ANALYTICS_READ]: ["GET"],
  [API_SCOPES.TEAMS_READ]: ["GET"],
  [API_SCOPES.TEAMS_WRITE]: ["POST", "PATCH", "DELETE"],
  [API_SCOPES.APPS_READ]: ["GET"],
  [API_SCOPES.APPS_WRITE]: ["POST", "PATCH", "DELETE"],
  [API_SCOPES.RAG_READ]: ["GET"],
  [API_SCOPES.RAG_WRITE]: ["POST", "DELETE"],
  [API_SCOPES.KNOWLEDGE_READ]: ["GET"],
  [API_SCOPES.PERMISSIONS_READ]: ["GET"],
  [API_SCOPES.PERMISSIONS_WRITE]: ["POST", "PATCH", "DELETE"],
  [API_SCOPES.MEDIA_READ]: ["GET"],
  [API_SCOPES.MEDIA_WRITE]: ["POST", "PATCH", "DELETE"],
  [API_SCOPES.AGENTS_READ]: ["GET"],
  [API_SCOPES.AGENTS_WRITE]: ["POST", "PATCH", "DELETE"],
  [API_SCOPES.CANVAS_READ]: ["GET"],
  [API_SCOPES.CANVAS_WRITE]: ["POST", "PATCH", "DELETE"],
  [API_SCOPES.CANVAS_EXECUTE]: ["POST"],
  [API_SCOPES.RESEARCH_READ]: ["GET"],
  [API_SCOPES.RESEARCH_WRITE]: ["POST"],
  [API_SCOPES.CONTROL_READ]: ["GET"],
  [API_SCOPES.CONTROL_WRITE]: ["POST", "PUT", "PATCH", "DELETE"],
  [API_SCOPES.CONTROL_EXECUTE]: ["POST"],
  [API_SCOPES.ADMIN_ALL]: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

export function getScopesForRoute(
  path: string,
  method: string
): string[] | null {
  if (path.startsWith("/api/v1/connectors")) {
    if (path.includes("/sync") && method === "POST") {
      return [API_SCOPES.CONNECTORS_SYNC];
    }
    if (method === "GET") {
      return [API_SCOPES.CONNECTORS_READ];
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return [API_SCOPES.CONNECTORS_WRITE];
    }
  }

  if (path.startsWith("/api/v1/search") && method === "GET") {
    return [API_SCOPES.SEARCH_READ];
  }

  if (path.startsWith("/api/v1/analytics") && method === "GET") {
    return [API_SCOPES.ANALYTICS_READ];
  }
  if (path.startsWith("/api/v1/teams")) {
    if (method === "GET") {
      return [API_SCOPES.TEAMS_READ];
    }
    return [API_SCOPES.TEAMS_WRITE];
  }
  if (path.startsWith("/api/v1/apps")) {
    if (method === "GET") {
      return [API_SCOPES.APPS_READ];
    }
    return [API_SCOPES.APPS_WRITE];
  }
  if (path.startsWith("/api/v1/rag")) {
    if (method === "GET") {
      return [API_SCOPES.RAG_READ];
    }
    return [API_SCOPES.RAG_WRITE];
  }
  if (path.startsWith("/api/v1/knowledge") && method === "GET") {
    return [API_SCOPES.KNOWLEDGE_READ];
  }
  if (path.startsWith("/api/v1/permissions")) {
    if (method === "GET") {
      return [API_SCOPES.PERMISSIONS_READ];
    }
    return [API_SCOPES.PERMISSIONS_WRITE];
  }
  if (path.startsWith("/api/v1/media")) {
    if (method === "GET") {
      return [API_SCOPES.MEDIA_READ];
    }
    return [API_SCOPES.MEDIA_WRITE];
  }
  if (path.startsWith("/api/v1/background-agents")) {
    if (method === "GET") {
      return [API_SCOPES.AGENTS_READ];
    }
    return [API_SCOPES.AGENTS_WRITE];
  }
  if (path.startsWith("/api/v1/extensions")) {
    return [API_SCOPES.AGENTS_WRITE];
  }
  if (path.startsWith("/api/v1/canvas")) {
    if (path.includes("/executions") && method === "POST") {
      return [API_SCOPES.CANVAS_EXECUTE];
    }
    if (method === "GET") {
      return [API_SCOPES.CANVAS_READ];
    }
    return [API_SCOPES.CANVAS_WRITE];
  }
  if (path.startsWith("/api/v1/research")) {
    if (method === "GET") {
      return [API_SCOPES.RESEARCH_READ];
    }
    return [API_SCOPES.RESEARCH_WRITE];
  }
  if (path.startsWith("/api/v1/control")) {
    if (path.includes("/execute") && method === "POST") {
      return [API_SCOPES.CONTROL_EXECUTE];
    }
    if (method === "GET") {
      return [API_SCOPES.CONTROL_READ];
    }
    return [API_SCOPES.CONTROL_WRITE];
  }
  if (path.startsWith("/api/v1/agent-control")) {
    if (method === "GET") {
      return [API_SCOPES.CONTROL_READ];
    }
    return [API_SCOPES.CONTROL_EXECUTE];
  }

  return null;
}
