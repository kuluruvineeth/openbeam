import type { BotPlatform } from "@openbeam/types/bot";
import type {
  BotInstallation,
  BotLinkRequest,
  BotUserLink,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateBotUserLinkData {
  teamId: string;
  userId: string;
  platform: BotPlatform;
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
  platform: BotPlatform;
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
  platform: BotPlatform;
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

export const linkBotAccount = async (
  db: Database,
  token: string,
  teamId: string,
  userId: string
): Promise<{ linkRequest: BotLinkRequest; userLink: BotUserLink }> =>
  db.$transaction(async (tx) => {
    const request = await tx.botLinkRequest.findUnique({ where: { token } });

    if (!request) {
      throw new Error("Link token not found");
    }
    if (request.consumed) {
      throw new Error("Link token already used");
    }
    if (request.expiresAt < new Date()) {
      throw new Error("Link token expired");
    }

    const linkRequest = await tx.botLinkRequest.update({
      where: { token },
      data: { consumed: true, teamId, userId },
    });

    const userLink = await tx.botUserLink.upsert({
      where: {
        platform_platformUserId_platformTeamId: {
          platform: request.platform,
          platformUserId: request.platformUserId,
          platformTeamId: request.platformTeamId,
        },
      },
      create: {
        teamId,
        userId,
        platform: request.platform,
        platformUserId: request.platformUserId,
        platformTeamId: request.platformTeamId,
      },
      update: { teamId, userId },
    });

    return { linkRequest, userLink };
  });

export const cleanupExpiredLinkRequests = async (
  db: Database
): Promise<{ count: number }> =>
  db.botLinkRequest.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { consumed: true }],
    },
  });
