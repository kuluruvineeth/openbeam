/**
 * API Scopes - Granular permission definitions
 * Following OAuth 2.0 scope naming conventions
 */

// ============================================================================
// Scope Definitions
// ============================================================================

export const API_SCOPES = {
  // Search permissions
  SEARCH_READ: "search:read",
  SEARCH_WRITE: "search:write", // Saved searches

  // Document permissions
  DOCUMENTS_READ: "documents:read",
  DOCUMENTS_WRITE: "documents:write",
  DOCUMENTS_DELETE: "documents:delete",

  // People/Directory permissions
  PEOPLE_READ: "people:read",

  // Connector permissions
  CONNECTORS_READ: "connectors:read",
  CONNECTORS_WRITE: "connectors:write",
  CONNECTORS_SYNC: "connectors:sync",
  CONNECTORS_DELETE: "connectors:delete",

  // Collections permissions
  COLLECTIONS_READ: "collections:read",
  COLLECTIONS_WRITE: "collections:write",
  COLLECTIONS_DELETE: "collections:delete",

  // Bookmarks permissions
  BOOKMARKS_READ: "bookmarks:read",
  BOOKMARKS_WRITE: "bookmarks:write",

  // Chat/Assistant permissions
  CHAT_READ: "chat:read",
  CHAT_WRITE: "chat:write",

  // Assistant management
  ASSISTANTS_READ: "assistants:read",
  ASSISTANTS_WRITE: "assistants:write",
  ASSISTANTS_DELETE: "assistants:delete",

  // Analytics permissions
  ANALYTICS_READ: "analytics:read",

  // API Key management
  API_KEYS_READ: "api_keys:read",
  API_KEYS_WRITE: "api_keys:write",
  API_KEYS_DELETE: "api_keys:delete",

  // Team/Admin permissions
  TEAM_READ: "team:read",
  TEAM_WRITE: "team:write",
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",

  // Admin permissions
  ADMIN_READ: "admin:read",
  ADMIN_WRITE: "admin:write",
  ADMIN_ALL: "admin:*",
} as const;

export type ApiScope = (typeof API_SCOPES)[keyof typeof API_SCOPES];

// ============================================================================
// Scope Groups
// ============================================================================

/**
 * Predefined scope groups for common use cases
 */
export const SCOPE_GROUPS = {
  // Read-only access to search and documents
  READ_ONLY: [
    API_SCOPES.SEARCH_READ,
    API_SCOPES.DOCUMENTS_READ,
    API_SCOPES.PEOPLE_READ,
    API_SCOPES.CONNECTORS_READ,
    API_SCOPES.COLLECTIONS_READ,
  ],

  // Standard access for integrations
  STANDARD: [
    API_SCOPES.SEARCH_READ,
    API_SCOPES.SEARCH_WRITE,
    API_SCOPES.DOCUMENTS_READ,
    API_SCOPES.DOCUMENTS_WRITE,
    API_SCOPES.PEOPLE_READ,
    API_SCOPES.CONNECTORS_READ,
    API_SCOPES.COLLECTIONS_READ,
    API_SCOPES.COLLECTIONS_WRITE,
    API_SCOPES.BOOKMARKS_READ,
    API_SCOPES.BOOKMARKS_WRITE,
    API_SCOPES.CHAT_READ,
    API_SCOPES.CHAT_WRITE,
  ],

  // Full access for admin integrations
  ADMIN: [API_SCOPES.ADMIN_ALL],

  // Minimal access for embedded widgets
  EMBED: [API_SCOPES.SEARCH_READ, API_SCOPES.CHAT_READ, API_SCOPES.CHAT_WRITE],

  // Webhook verification only
  WEBHOOK: [API_SCOPES.CONNECTORS_READ],
} as const;

// ============================================================================
// Scope Utilities
// ============================================================================

/**
 * Check if a scope is a wildcard admin scope
 */
export function isAdminScope(scope: string): boolean {
  return scope === API_SCOPES.ADMIN_ALL || scope.startsWith("admin:");
}

/**
 * Check if scopes include required permissions
 */
export function hasScopes(
  grantedScopes: string[],
  requiredScopes: string[]
): boolean {
  // Admin wildcard grants all permissions
  if (grantedScopes.includes(API_SCOPES.ADMIN_ALL)) {
    return true;
  }

  return requiredScopes.every((required) => {
    // Check for exact match
    if (grantedScopes.includes(required)) {
      return true;
    }

    // Check for category wildcard (e.g., "documents:*" covers "documents:read")
    const [category] = required.split(":");
    const categoryWildcard = `${category}:*`;
    return grantedScopes.includes(categoryWildcard);
  });
}

/**
 * Get scope description for documentation
 */
export function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    [API_SCOPES.SEARCH_READ]: "Search across indexed documents",
    [API_SCOPES.SEARCH_WRITE]: "Create and manage saved searches",
    [API_SCOPES.DOCUMENTS_READ]: "Read document content and metadata",
    [API_SCOPES.DOCUMENTS_WRITE]: "Create and update documents",
    [API_SCOPES.DOCUMENTS_DELETE]: "Delete documents",
    [API_SCOPES.PEOPLE_READ]: "Access people directory",
    [API_SCOPES.CONNECTORS_READ]: "View connector status and configuration",
    [API_SCOPES.CONNECTORS_WRITE]: "Create and update connectors",
    [API_SCOPES.CONNECTORS_SYNC]: "Trigger connector syncs",
    [API_SCOPES.CONNECTORS_DELETE]: "Delete connectors",
    [API_SCOPES.COLLECTIONS_READ]: "View collections",
    [API_SCOPES.COLLECTIONS_WRITE]: "Create and update collections",
    [API_SCOPES.COLLECTIONS_DELETE]: "Delete collections",
    [API_SCOPES.BOOKMARKS_READ]: "View bookmarks",
    [API_SCOPES.BOOKMARKS_WRITE]: "Manage bookmarks",
    [API_SCOPES.CHAT_READ]: "Read conversation history",
    [API_SCOPES.CHAT_WRITE]: "Send messages and create conversations",
    [API_SCOPES.ASSISTANTS_READ]: "View AI assistants",
    [API_SCOPES.ASSISTANTS_WRITE]: "Create and update AI assistants",
    [API_SCOPES.ASSISTANTS_DELETE]: "Delete AI assistants",
    [API_SCOPES.ANALYTICS_READ]: "View usage analytics",
    [API_SCOPES.API_KEYS_READ]: "View API keys",
    [API_SCOPES.API_KEYS_WRITE]: "Create and update API keys",
    [API_SCOPES.API_KEYS_DELETE]: "Revoke API keys",
    [API_SCOPES.TEAM_READ]: "View team information",
    [API_SCOPES.TEAM_WRITE]: "Update team settings",
    [API_SCOPES.USERS_READ]: "View team members",
    [API_SCOPES.USERS_WRITE]: "Manage team members",
    [API_SCOPES.ADMIN_READ]: "Admin read access",
    [API_SCOPES.ADMIN_WRITE]: "Admin write access",
    [API_SCOPES.ADMIN_ALL]: "Full admin access",
  };

  return descriptions[scope] ?? "Unknown permission";
}

/**
 * Group scopes by category for display
 */
export function groupScopesByCategory(
  scopes: string[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const scope of scopes) {
    const [category] = scope.split(":");
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(scope);
  }

  return grouped;
}
