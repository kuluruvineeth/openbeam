export const ProfileCacheKeys = {
  userProfile: (teamId: string, userId: string) =>
    `profile:${teamId}:${userId}`,

  userEmbeddings: (teamId: string, userId: string) =>
    `profile:embed:${teamId}:${userId}`,

  userTopics: (teamId: string, userId: string) =>
    `profile:topics:${teamId}:${userId}`,

  teamDefaults: (teamId: string) => `profile:team:${teamId}:defaults`,

  departmentDefaults: (teamId: string, department: string) =>
    `profile:dept:${teamId}:${department}`,

  profileUpdateLock: (teamId: string, userId: string) =>
    `profile:lock:${teamId}:${userId}`,
} as const;

export const PROFILE_CACHE_TTL = 600;
export const EMBEDDING_CACHE_TTL = 1800;
export const TEAM_DEFAULTS_TTL = 3600;
