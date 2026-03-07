-- DropForeignKey
ALTER TABLE "mission_memory" DROP CONSTRAINT IF EXISTS "mission_memory_missionId_fkey";

-- DropForeignKey
ALTER TABLE "mission_activity" DROP CONSTRAINT IF EXISTS "mission_activity_missionId_fkey";

-- DropForeignKey
ALTER TABLE "mission_run" DROP CONSTRAINT IF EXISTS "mission_run_agentId_fkey";

-- DropForeignKey
ALTER TABLE "mission_run" DROP CONSTRAINT IF EXISTS "mission_run_taskId_fkey";

-- DropForeignKey
ALTER TABLE "mission_run" DROP CONSTRAINT IF EXISTS "mission_run_missionId_fkey";

-- DropForeignKey
ALTER TABLE "mission_comment" DROP CONSTRAINT IF EXISTS "mission_comment_fromAgentId_fkey";

-- DropForeignKey
ALTER TABLE "mission_comment" DROP CONSTRAINT IF EXISTS "mission_comment_taskId_fkey";

-- DropForeignKey
ALTER TABLE "mission_task" DROP CONSTRAINT IF EXISTS "mission_task_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "mission_task" DROP CONSTRAINT IF EXISTS "mission_task_missionId_fkey";

-- DropForeignKey
ALTER TABLE "mission_agent" DROP CONSTRAINT IF EXISTS "mission_agent_agentId_fkey";

-- DropForeignKey
ALTER TABLE "mission_agent" DROP CONSTRAINT IF EXISTS "mission_agent_missionId_fkey";

-- DropForeignKey
ALTER TABLE "mission" DROP CONSTRAINT IF EXISTS "mission_teamId_fkey";

-- DropTable
DROP TABLE IF EXISTS "mission_memory";

-- DropTable
DROP TABLE IF EXISTS "mission_activity";

-- DropTable
DROP TABLE IF EXISTS "mission_run";

-- DropTable
DROP TABLE IF EXISTS "mission_comment";

-- DropTable
DROP TABLE IF EXISTS "mission_task";

-- DropTable
DROP TABLE IF EXISTS "mission_agent";

-- DropTable
DROP TABLE IF EXISTS "mission";

-- DropEnum
DROP TYPE IF EXISTS "MissionRunStatus";

-- DropEnum
DROP TYPE IF EXISTS "MissionTaskPriority";

-- DropEnum
DROP TYPE IF EXISTS "MissionTaskStatus";

-- DropEnum
DROP TYPE IF EXISTS "MissionStatus";
