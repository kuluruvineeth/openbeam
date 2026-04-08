import type { BotPlatform } from "@openbeam/types/bot";
import type {
  BotInstallation,
  BotLinkRequest,
  BotUserLink,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export const findBotUserLink = async (
  db: Database,
  platform: BotPlatform,
  platformUserId: string,
  platformTeamId: string
): Promise<BotUserLink | null> =>
  db.botUserLink.findUnique({
    where: {
      platform_platformUserId_platformTeamId: {
        platform,
        platformUserId,
        platformTeamId,
      },
    },
  });

export const findBotInstallation = async (
  db: Database,
  platform: BotPlatform,
  platformTeamId: string
): Promise<BotInstallation | null> =>
  db.botInstallation.findUnique({
    where: {
      platform_platformTeamId: {
        platform,
        platformTeamId,
      },
    },
  });

export const listBotInstallations = async (
  db: Database,
  teamId: string
): Promise<BotInstallation[]> =>
  db.botInstallation.findMany({
    where: { teamId, active: true },
    orderBy: { installedAt: "desc" },
  });

export const findBotLinkRequest = async (
  db: Database,
  token: string
): Promise<BotLinkRequest | null> =>
  db.botLinkRequest.findUnique({ where: { token } });
