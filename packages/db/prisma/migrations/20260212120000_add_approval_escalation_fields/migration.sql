-- AlterTable
ALTER TABLE "agent_canvas_approval" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "escalatedTo" TEXT;
