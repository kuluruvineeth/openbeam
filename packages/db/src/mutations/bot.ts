import type {
  BotInstallation,
  BotLinkRequest,
  BotUserLink,
} from "../../prisma/generated/client";
import type { Database } from "../index";
import type { BotPlatformId } from "../queries/bot";

export interface CreateBotUserLinkData {
  teamId: string;
  userId: string;
  platform: BotPlatformId;
  platformUserId: string;
  platformTeamId: string;
  platformUsername?: string;
}

export const createBotUserLink = async (
  db: Database,
  data: CreateBotUserLinkData
): Promise<BotUserLink> => db.botUserLink.create({ data });

export const updateBotUserLinkActivity = async (
  db: Database,
  id: string
): Promise<BotUserLink> =>
  db.botUserLink.update({
    where: { id },
    data: { lastActiveAt: new Date() },
  });

export interface CreateBotInstallationData {
  teamId: string;
  platform: BotPlatformId;
  platformTeamId: string;
  platformTeamName?: string;
  installedBy: string;
  botToken: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string[];
  webhookUrl?: string;
}

export const createBotInstallation = async (
  db: Database,
  data: CreateBotInstallationData
): Promise<BotInstallation> => db.botInstallation.create({ data });

export interface UpdateBotInstallationData {
  botToken?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string[];
  webhookUrl?: string;
  active?: boolean;
}

export const updateBotInstallation = async (
  db: Database,
  id: string,
  data: UpdateBotInstallationData
): Promise<BotInstallation> =>
  db.botInstallation.update({ where: { id }, data });

export const deactivateBotInstallation = async (
  db: Database,
  id: string
): Promise<BotInstallation> =>
  db.botInstallation.update({
    where: { id },
    data: { active: false },
  });

export interface CreateBotLinkRequestData {
  platform: BotPlatformId;
  platformUserId: string;
  platformTeamId: string;
  token: string;
  expiresAt: Date;
}

export const createBotLinkRequest = async (
  db: Database,
  data: CreateBotLinkRequestData
): Promise<BotLinkRequest> => db.botLinkRequest.create({ data });

export const consumeBotLinkRequest = async (
  db: Database,
  token: string,
  teamId: string,
  userId: string
): Promise<BotLinkRequest> =>
  db.botLinkRequest.update({
    where: { token },
    data: { consumed: true, teamId, userId },
  });

export const cleanupExpiredLinkRequests = async (
  db: Database
): Promise<{ count: number }> =>
  db.botLinkRequest.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { consumed: true }],
    },
  });
