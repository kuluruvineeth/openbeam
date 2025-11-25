/**
 * Authentication Types
 * Centralized type definitions for API key and session authentication
 */

import { API_SCOPES, hasScopes } from "./scopes";

export { API_SCOPES };

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
    return hasScopes(context.scopes, requiredScopes);
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
  [API_SCOPES.DOCUMENTS_READ]: ["GET"],
  [API_SCOPES.DOCUMENTS_WRITE]: ["POST", "PUT", "PATCH"],
  [API_SCOPES.DOCUMENTS_DELETE]: ["DELETE"],
  [API_SCOPES.PEOPLE_READ]: ["GET"],
  [API_SCOPES.COLLECTIONS_READ]: ["GET"],
  [API_SCOPES.COLLECTIONS_WRITE]: ["POST", "PUT", "PATCH"],
  [API_SCOPES.COLLECTIONS_DELETE]: ["DELETE"],
  [API_SCOPES.BOOKMARKS_READ]: ["GET"],
  [API_SCOPES.BOOKMARKS_WRITE]: ["POST", "PUT", "PATCH", "DELETE"],
  [API_SCOPES.CHAT_READ]: ["GET"],
  [API_SCOPES.CHAT_WRITE]: ["POST"],
  [API_SCOPES.ASSISTANTS_READ]: ["GET"],
  [API_SCOPES.ASSISTANTS_WRITE]: ["POST", "PUT", "PATCH"],
  [API_SCOPES.ASSISTANTS_DELETE]: ["DELETE"],
  [API_SCOPES.ANALYTICS_READ]: ["GET"],
  [API_SCOPES.API_KEYS_READ]: ["GET"],
  [API_SCOPES.API_KEYS_WRITE]: ["POST", "PUT", "PATCH"],
  [API_SCOPES.API_KEYS_DELETE]: ["DELETE"],
  [API_SCOPES.TEAM_READ]: ["GET"],
  [API_SCOPES.TEAM_WRITE]: ["POST", "PUT", "PATCH"],
  [API_SCOPES.USERS_READ]: ["GET"],
  [API_SCOPES.USERS_WRITE]: ["POST", "PUT", "PATCH", "DELETE"],
  [API_SCOPES.ADMIN_ALL]: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

/**
 * Route scope configuration
 */
interface RouteScopeConfig {
  prefix: string;
  subPath?: string;
  scopes: Record<string, string[]>;
}

/**
 * Route to scope mapping configuration
 */
const ROUTE_SCOPE_CONFIG: RouteScopeConfig[] = [
  {
    prefix: "/api/v1/connectors",
    subPath: "/sync",
    scopes: {
      POST: [API_SCOPES.CONNECTORS_SYNC],
    },
  },
  {
    prefix: "/api/v1/connectors",
    scopes: {
      GET: [API_SCOPES.CONNECTORS_READ],
      POST: [API_SCOPES.CONNECTORS_WRITE],
      PUT: [API_SCOPES.CONNECTORS_WRITE],
      PATCH: [API_SCOPES.CONNECTORS_WRITE],
      DELETE: [API_SCOPES.CONNECTORS_WRITE],
    },
  },
  {
    prefix: "/api/v1/search",
    scopes: {
      GET: [API_SCOPES.SEARCH_READ],
    },
  },
  {
    prefix: "/api/v1/documents",
    scopes: {
      GET: [API_SCOPES.DOCUMENTS_READ],
      POST: [API_SCOPES.DOCUMENTS_WRITE],
      PUT: [API_SCOPES.DOCUMENTS_WRITE],
      PATCH: [API_SCOPES.DOCUMENTS_WRITE],
      DELETE: [API_SCOPES.DOCUMENTS_DELETE],
    },
  },
  {
    prefix: "/api/v1/people",
    scopes: {
      GET: [API_SCOPES.PEOPLE_READ],
    },
  },
  {
    prefix: "/api/v1/chat",
    subPath: "/conversations",
    scopes: {
      GET: [API_SCOPES.CHAT_READ],
      POST: [API_SCOPES.CHAT_WRITE],
      PUT: [API_SCOPES.CHAT_WRITE],
      PATCH: [API_SCOPES.CHAT_WRITE],
      DELETE: [API_SCOPES.CHAT_WRITE],
    },
  },
  {
    prefix: "/api/v1/chat",
    subPath: "/assistants",
    scopes: {
      GET: [API_SCOPES.ASSISTANTS_READ],
      POST: [API_SCOPES.ASSISTANTS_WRITE],
      PUT: [API_SCOPES.ASSISTANTS_WRITE],
      PATCH: [API_SCOPES.ASSISTANTS_WRITE],
      DELETE: [API_SCOPES.ASSISTANTS_DELETE],
    },
  },
  {
    prefix: "/api/v1/collections",
    scopes: {
      GET: [API_SCOPES.COLLECTIONS_READ],
      POST: [API_SCOPES.COLLECTIONS_WRITE],
      PUT: [API_SCOPES.COLLECTIONS_WRITE],
      PATCH: [API_SCOPES.COLLECTIONS_WRITE],
      DELETE: [API_SCOPES.COLLECTIONS_DELETE],
    },
  },
  {
    prefix: "/api/v1/bookmarks",
    scopes: {
      GET: [API_SCOPES.BOOKMARKS_READ],
      POST: [API_SCOPES.BOOKMARKS_WRITE],
      PUT: [API_SCOPES.BOOKMARKS_WRITE],
      PATCH: [API_SCOPES.BOOKMARKS_WRITE],
      DELETE: [API_SCOPES.BOOKMARKS_WRITE],
    },
  },
  {
    prefix: "/api/v1/api-keys",
    subPath: "/revoke",
    scopes: {
      POST: [API_SCOPES.API_KEYS_DELETE],
    },
  },
  {
    prefix: "/api/v1/api-keys",
    scopes: {
      GET: [API_SCOPES.API_KEYS_READ],
      POST: [API_SCOPES.API_KEYS_WRITE],
      PUT: [API_SCOPES.API_KEYS_WRITE],
      PATCH: [API_SCOPES.API_KEYS_WRITE],
      DELETE: [API_SCOPES.API_KEYS_DELETE],
    },
  },
];

/**
 * Get required scopes for a route pattern and method
 */
export function getScopesForRoute(
  path: string,
  method: string
): string[] | null {
  const upperMethod = method.toUpperCase();

  // Find matching route config (more specific subPath routes first)
  for (const config of ROUTE_SCOPE_CONFIG) {
    if (!path.startsWith(config.prefix)) {
      continue;
    }

    // If subPath is specified, path must include it
    if (config.subPath && !path.includes(config.subPath)) {
      continue;
    }

    // If no subPath but another config with subPath matches, skip this one
    if (!config.subPath) {
      const hasMoreSpecificMatch = ROUTE_SCOPE_CONFIG.some(
        (c) =>
          c.prefix === config.prefix &&
          c.subPath &&
          path.includes(c.subPath) &&
          c.scopes[upperMethod]
      );
      if (hasMoreSpecificMatch) {
        continue;
      }
    }

    const scopes = config.scopes[upperMethod];
    if (scopes) {
      return scopes;
    }
  }

  return null;
}
