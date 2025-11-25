import type { Database } from "../index";

// === Notification Query Types ===

export interface UserPreferencesResult {
  userId: string;
  emailDigest: string;
  mentionNotifications: boolean;
  documentUpdates: boolean;
  weeklyReport: boolean;
  timezone: string;
  language: string;
}

export interface UserNotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  slackEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string;
}

// === Notification Queries ===

/**
 * Get user preferences
 */
export const getUserPreferences = async (
  db: Database,
  userId: string
): Promise<UserPreferencesResult | null> => {
  const prefs = await db.userPreferences.findUnique({
    where: { userId },
  });

  if (!prefs) {
    return null;
  }

  return {
    userId: prefs.userId,
    emailDigest: prefs.emailDigest,
    mentionNotifications: prefs.mentionNotifications,
    documentUpdates: prefs.documentUpdates,
    weeklyReport: prefs.weeklyReport,
    timezone: prefs.timezone,
    language: prefs.language,
  };
};

/**
 * Get user notification settings (computed from preferences)
 */
export const getUserNotificationSettings = async (
  db: Database,
  userId: string
): Promise<UserNotificationSettings> => {
  const prefs = await db.userPreferences.findUnique({
    where: { userId },
  });

  if (!prefs) {
    // Return defaults
    return {
      emailEnabled: true,
      pushEnabled: true,
      slackEnabled: true,
      inAppEnabled: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      timezone: "UTC",
    };
  }

  return {
    emailEnabled: prefs.emailDigest !== "never",
    pushEnabled: prefs.mentionNotifications,
    slackEnabled: true,
    inAppEnabled: true,
    quietHoursStart: null, // Could be stored in preferences
    quietHoursEnd: null,
    timezone: prefs.timezone,
  };
};

/**
 * Get user's email address
 */
export const getUserEmail = async (
  db: Database,
  userId: string
): Promise<string | null> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  return user?.email || null;
};

/**
 * Get user's push notification tokens
 */
export const getUserPushTokens = async (
  db: Database,
  userId: string
): Promise<string[]> => {
  const devices = await db.device.findMany({
    where: {
      userId,
      isActive: true,
      pushToken: { not: null },
    },
    select: { pushToken: true },
  });

  return devices.map((d) => d.pushToken!).filter(Boolean);
};

/**
 * Get team's Slack webhook URL (if configured)
 */
export const getTeamSlackWebhook = async (
  db: Database,
  teamId: string
): Promise<string | null> => {
  // This would come from team settings or connector config
  const connector = await db.connector.findFirst({
    where: {
      teamId,
      provider: "slack",
      status: "ACTIVE",
    },
    select: { config: true },
  });

  if (!connector) {
    return null;
  }

  const config = connector.config as { webhookUrl?: string } | null;
  return config?.webhookUrl || null;
};

/**
 * Check if user is in quiet hours
 */
export const isUserInQuietHours = async (
  db: Database,
  userId: string
): Promise<boolean> => {
  const _prefs = await db.userPreferences.findUnique({
    where: { userId },
    select: { timezone: true },
  });

  // TODO: Implement quiet hours check based on user timezone
  // For now, return false (not in quiet hours)
  return false;
};

/**
 * Get users who should receive a notification type
 */
export const getUsersForNotificationType = async (
  db: Database,
  teamId: string,
  notificationType: "mention" | "document_update" | "weekly_report"
): Promise<Array<{ userId: string; email: string }>> => {
  let preferenceField: string;

  switch (notificationType) {
    case "mention":
      preferenceField = "mentionNotifications";
      break;
    case "document_update":
      preferenceField = "documentUpdates";
      break;
    case "weekly_report":
      preferenceField = "weeklyReport";
      break;
  }

  const users = await db.usersOnTeam.findMany({
    where: { teamId },
    include: {
      user: {
        include: {
          preferences: true,
        },
      },
    },
  });

  return users
    .filter((ut) => {
      const prefs = ut.user.preferences;
      if (!prefs) {
        return true; // Default to enabled
      }
      return prefs[preferenceField as keyof typeof prefs] !== false;
    })
    .map((ut) => ({
      userId: ut.user.id,
      email: ut.user.email || "",
    }))
    .filter((u) => u.email);
};

/**
 * Get team admins for admin notifications
 */
export const getTeamAdmins = async (
  db: Database,
  teamId: string
): Promise<Array<{ userId: string; email: string }>> => {
  const admins = await db.usersOnTeam.findMany({
    where: {
      teamId,
      role: { in: ["ADMIN", "OWNER"] },
    },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });

  return admins
    .map((a) => ({
      userId: a.user.id,
      email: a.user.email || "",
    }))
    .filter((u) => u.email);
};
