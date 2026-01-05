export const API_SCOPES = {
  CONNECTORS_READ: "connectors:read",
  CONNECTORS_WRITE: "connectors:write",
  CONNECTORS_SYNC: "connectors:sync",

  SEARCH_READ: "search:read",
  ANALYTICS_READ: "analytics:read",
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
      type: "none";
    };

export function hasRequiredScopes(
  context: AuthContext,
  requiredScopes: string[]
): boolean {
  if (context.type === "session") {
    return true;
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
  if (context.type === "apiKey") {
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

  return Array.from(identifiers);
}

export const SCOPE_METHOD_MAP: Record<string, string[]> = {
  [API_SCOPES.CONNECTORS_READ]: ["GET"],
  [API_SCOPES.CONNECTORS_WRITE]: ["POST", "PUT", "PATCH", "DELETE"],
  [API_SCOPES.CONNECTORS_SYNC]: ["POST"],
  [API_SCOPES.SEARCH_READ]: ["GET"],
  [API_SCOPES.ANALYTICS_READ]: ["GET"],
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

  return null;
}
