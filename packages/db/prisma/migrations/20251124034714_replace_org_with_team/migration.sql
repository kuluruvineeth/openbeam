/*
  Warnings:

  - You are about to drop the column `organizationId` on the `api_key` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `connector` table. All the data in the column will be lost.
  - You are about to drop the column `activeOrganizationId` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `tool` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveOrganizationId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `workspace` table. All the data in the column will be lost.
  - You are about to drop the `invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `member` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[teamId,workspaceExternalId,app,name]` on the table `connector` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamId,connectorId,toolName]` on the table `tool` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamId` to the `api_key` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `connector` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `tool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamId` to the `workspace` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "api_key" DROP CONSTRAINT "api_key_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "connector" DROP CONSTRAINT "connector_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_userId_fkey";

-- DropForeignKey
ALTER TABLE "tool" DROP CONSTRAINT "tool_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "workspace" DROP CONSTRAINT "workspace_organizationId_fkey";

-- DropIndex
DROP INDEX "api_key_organizationId_idx";

-- DropIndex
DROP INDEX "connector_organizationId_status_idx";

-- DropIndex
DROP INDEX "connector_organizationId_workspaceExternalId_app_name_key";

-- DropIndex
DROP INDEX "tool_organizationId_connectorId_toolName_key";

-- DropIndex
DROP INDEX "workspace_organizationId_idx";

-- AlterTable
ALTER TABLE "api_key" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "connector" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "session" DROP COLUMN "activeOrganizationId";

-- AlterTable
ALTER TABLE "tool" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "lastActiveOrganizationId",
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "workspace" DROP COLUMN "organizationId",
ADD COLUMN     "teamId" TEXT NOT NULL;

-- DropTable
DROP TABLE "invitation";

-- DropTable
DROP TABLE "member";

-- DropTable
DROP TABLE "organization";

-- DropEnum
DROP TYPE "InvitationStatus";

-- DropEnum
DROP TYPE "MemberRole";

-- CreateTable
CREATE TABLE "team" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" JSONB,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxConnectors" INTEGER NOT NULL DEFAULT 10,
    "maxTools" INTEGER NOT NULL DEFAULT 100,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "team_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "users_on_team" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_on_team_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "user_invite" (
    "_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "code" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,

    CONSTRAINT "user_invite_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_slug_key" ON "team"("slug");

-- CreateIndex
CREATE INDEX "users_on_team_userId_idx" ON "users_on_team"("userId");

-- CreateIndex
CREATE INDEX "users_on_team_teamId_idx" ON "users_on_team"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "users_on_team_userId_teamId_key" ON "users_on_team"("userId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "user_invite_code_key" ON "user_invite"("code");

-- CreateIndex
CREATE INDEX "user_invite_teamId_idx" ON "user_invite"("teamId");

-- CreateIndex
CREATE INDEX "user_invite_email_idx" ON "user_invite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_invite_teamId_email_key" ON "user_invite"("teamId", "email");

-- CreateIndex
CREATE INDEX "api_key_teamId_idx" ON "api_key"("teamId");

-- CreateIndex
CREATE INDEX "connector_teamId_status_idx" ON "connector"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connector_teamId_workspaceExternalId_app_name_key" ON "connector"("teamId", "workspaceExternalId", "app", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tool_teamId_connectorId_toolName_key" ON "tool"("teamId", "connectorId", "toolName");

-- CreateIndex
CREATE INDEX "user_teamId_idx" ON "user"("teamId");

-- CreateIndex
CREATE INDEX "workspace_teamId_idx" ON "workspace"("teamId");

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector" ADD CONSTRAINT "connector_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool" ADD CONSTRAINT "tool_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_on_team" ADD CONSTRAINT "users_on_team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_on_team" ADD CONSTRAINT "users_on_team_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invite" ADD CONSTRAINT "user_invite_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invite" ADD CONSTRAINT "user_invite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
