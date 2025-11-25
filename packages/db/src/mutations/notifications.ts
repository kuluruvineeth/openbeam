import type { Database } from "../index";

// === Notification Mutation Types ===

export interface UpdateUserPreferencesInput {
  emailDigest?: string;
  mentionNotifications?: boolean;
  documentUpdates?: boolean;
  weeklyReport?: boolean;
  timezone?: string;
  language?: string;
}

// === Notification Mutations ===

/**
 * Create or update user preferences
 */
export const upsertUserPreferences = async (
  db: Database,
  userId: string,
  preferences: UpdateUserPreferencesInput
): Promise<void> => {
  await db.userPreferences.upsert({
    where: { userId },
    update: {
      ...preferences,
      updatedAt: new Date(),
    },
    create: {
      userId,
      emailDigest: preferences.emailDigest || "daily",
      mentionNotifications: preferences.mentionNotifications ?? true,
      documentUpdates: preferences.documentUpdates ?? true,
      weeklyReport: preferences.weeklyReport ?? true,
      timezone: preferences.timezone || "UTC",
      language: preferences.language || "en",
    },
  });
};

/**
 * Update email digest preference
 */
export const updateEmailDigest = async (
  db: Database,
  userId: string,
  digest: "realtime" | "daily" | "weekly" | "never"
): Promise<void> => {
  await db.userPreferences.upsert({
    where: { userId },
    update: {
      emailDigest: digest,
      updatedAt: new Date(),
    },
    create: {
      userId,
      emailDigest: digest,
    },
  });
};

/**
 * Toggle mention notifications
 */
export const toggleMentionNotifications = async (
  db: Database,
  userId: string,
  enabled: boolean
): Promise<void> => {
  await db.userPreferences.upsert({
    where: { userId },
    update: {
      mentionNotifications: enabled,
      updatedAt: new Date(),
    },
    create: {
      userId,
      mentionNotifications: enabled,
    },
  });
};

/**
 * Toggle document update notifications
 */
export const toggleDocumentUpdates = async (
  db: Database,
  userId: string,
  enabled: boolean
): Promise<void> => {
  await db.userPreferences.upsert({
    where: { userId },
    update: {
      documentUpdates: enabled,
      updatedAt: new Date(),
    },
    create: {
      userId,
      documentUpdates: enabled,
    },
  });
};

/**
 * Toggle weekly report
 */
export const toggleWeeklyReport = async (
  db: Database,
  userId: string,
  enabled: boolean
): Promise<void> => {
  await db.userPreferences.upsert({
    where: { userId },
    update: {
      weeklyReport: enabled,
      updatedAt: new Date(),
    },
    create: {
      userId,
      weeklyReport: enabled,
    },
  });
};

/**
 * Update user timezone
 */
export const updateTimezone = async (
  db: Database,
  userId: string,
  timezone: string
): Promise<void> => {
  await db.userPreferences.upsert({
    where: { userId },
    update: {
      timezone,
      updatedAt: new Date(),
    },
    create: {
      userId,
      timezone,
    },
  });
};

/**
 * Register a push notification token
 */
export const registerPushToken = async (
  db: Database,
  userId: string,
  deviceInfo: {
    deviceId: string;
    deviceType: string;
    pushToken: string;
    appVersion?: string;
  }
): Promise<void> => {
  await db.device.upsert({
    where: {
      userId_deviceId: {
        userId,
        deviceId: deviceInfo.deviceId,
      },
    },
    update: {
      pushToken: deviceInfo.pushToken,
      appVersion: deviceInfo.appVersion,
      lastActiveAt: new Date(),
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      userId,
      deviceId: deviceInfo.deviceId,
      deviceType: deviceInfo.deviceType,
      pushToken: deviceInfo.pushToken,
      appVersion: deviceInfo.appVersion,
      isActive: true,
    },
  });
};

/**
 * Unregister a push notification token
 */
export const unregisterPushToken = async (
  db: Database,
  userId: string,
  deviceId: string
): Promise<void> => {
  await db.device.updateMany({
    where: { userId, deviceId },
    data: {
      pushToken: null,
      isActive: false,
      updatedAt: new Date(),
    },
  });
};

/**
 * Deactivate all user devices
 */
export const deactivateUserDevices = async (
  db: Database,
  userId: string
): Promise<number> => {
  const result = await db.device.updateMany({
    where: { userId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  return result.count;
};

/**
 * Update device last active timestamp
 */
export const touchDevice = async (
  db: Database,
  userId: string,
  deviceId: string
): Promise<void> => {
  await db.device.updateMany({
    where: { userId, deviceId },
    data: {
      lastActiveAt: new Date(),
    },
  });
};

/**
 * Clean up inactive devices
 */
export const cleanupInactiveDevices = async (
  db: Database,
  olderThan: Date
): Promise<number> => {
  const result = await db.device.deleteMany({
    where: {
      isActive: false,
      lastActiveAt: { lt: olderThan },
    },
  });

  return result.count;
};
