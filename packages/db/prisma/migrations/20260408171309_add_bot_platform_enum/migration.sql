-- CreateEnum
CREATE TYPE "BotPlatform" AS ENUM ('SLACK', 'TEAMS', 'DISCORD', 'TELEGRAM', 'WHATSAPP');

-- AlterTable
ALTER TABLE "bot_user_link" ALTER COLUMN "platform" TYPE "BotPlatform" USING "platform"::"BotPlatform";

-- AlterTable
ALTER TABLE "bot_installation" ALTER COLUMN "platform" TYPE "BotPlatform" USING "platform"::"BotPlatform";

-- AlterTable
ALTER TABLE "bot_link_request" ALTER COLUMN "platform" TYPE "BotPlatform" USING "platform"::"BotPlatform";
