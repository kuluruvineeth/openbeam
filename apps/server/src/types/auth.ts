/**
 * Authentication Types
 * Centralized type definitions for API key and session authentication
 */

export const API_SCOPES = {
  // Connector permissions
  CONNECTORS_READ: "connectors:read",
  CONNECTORS_WRITE: "connectors:write",
  CONNECTORS_SYNC: "connectors:sync",

  // Search permissions
  SEARCH_READ: "search:read",

  // Admin permissions (future)
  ADMIN_ALL: "admin:*",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

/**
 * Authentication context discriminated union
 */
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

/**
 * Check if auth context has required scopes
 */
export function hasRequiredScopes(
  context: AuthContext,
  requiredScopes: string[]
): boolean {
  // Session users have implicit full access
  if (context.type === "session") {
    return true;
  }

  // API keys must have explicit scopes
  if (context.type === "apiKey") {
    // Check for admin wildcard
    if (context.scopes.includes(API_SCOPES.ADMIN_ALL)) {
      return true;
    }

    // Check if all required scopes are present
    return requiredScopes.every((required) =>
      context.scopes.includes(required)
    );
  }

  // No authentication
  return false;
}

/**
 * Get team ID from auth context
 */
export function getTeamId(context: AuthContext): string | null {
  if (context.type === "session") {
    return context.teamId;
  }
  if (context.type === "apiKey") {
    return context.teamId;
  }
  return null;
}

/**
 * @deprecated Use getTeamId instead
 */
export function getOrganizationId(context: AuthContext): string | null {
  return getTeamId(context);
}

/**
 * Get access control identifiers for document-level permissions
 * - Session users: their user ID and email
 * - API keys: team-level access (empty array = team-level)
 */
export function getAccessControlIds(context: AuthContext): string[] {
  if (context.type === "session") {
    const identifiers = new Set<string>();
    identifiers.add(context.userId);
    if (context.email) {
      identifiers.add(context.email);
    }
    return Array.from(identifiers);
  }

  // API keys have team-level access
  // Empty array signals to search service to use team-level filtering
  return [];
}

/**
 * Scope to HTTP method mapping
 */
export const SCOPE_METHOD_MAP: Record<string, string[]> = {
  [API_SCOPES.CONNECTORS_READ]: ["GET"],
  [API_SCOPES.CONNECTORS_WRITE]: ["POST", "PUT", "PATCH", "DELETE"],
  [API_SCOPES.CONNECTORS_SYNC]: ["POST"],
  [API_SCOPES.SEARCH_READ]: ["GET"],
  [API_SCOPES.ADMIN_ALL]: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

/**
 * Get required scopes for a route pattern and method
 */
export function getScopesForRoute(
  path: string,
  method: string
): string[] | null {
  // Connector routes
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

  // Search routes
  if (path.startsWith("/api/v1/search") && method === "GET") {
    return [API_SCOPES.SEARCH_READ];
  }

  return null;
}
