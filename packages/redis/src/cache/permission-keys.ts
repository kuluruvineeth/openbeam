export const PermissionCacheKeys = {
  userPermissionSet: (teamId: string, userId: string) =>
    `perm:${teamId}:user:${userId}`,

  userGroups: (teamId: string, userId: string) =>
    `perm:${teamId}:groups:${userId}`,

  userConnectorScopes: (teamId: string, userId: string) =>
    `perm:${teamId}:scopes:${userId}`,

  groupMembers: (teamId: string, groupId: string) =>
    `perm:${teamId}:gmembers:${groupId}`,

  connectorUsers: (teamId: string, connectorId: string) =>
    `perm:${teamId}:cusers:${connectorId}`,

  documentPermissions: (teamId: string, documentId: string) =>
    `perm:${teamId}:doc:${documentId}`,

  connectorSyncLock: (connectorId: string) => `perm:sync:lock:${connectorId}`,
} as const;

export const PERMISSION_CACHE_TTL = 300;
export const GROUP_CACHE_TTL = 600;
export const DOCUMENT_CACHE_TTL = 120;
