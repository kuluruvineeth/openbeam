-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('WELCOME', 'CONNECT_SOURCE', 'SYNC_PROGRESS', 'FIRST_SEARCH', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "onboarding_state" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "currentStep" "OnboardingStep" NOT NULL DEFAULT 'WELCOME',
    "completedSteps" "OnboardingStep"[],
    "status" "OnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "connectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_state_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_state_userId_teamId_key" ON "onboarding_state"("userId", "teamId");

-- CreateIndex
CREATE INDEX "onboarding_state_teamId_idx" ON "onboarding_state"("teamId");

-- AddForeignKey
ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
