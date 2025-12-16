-- AlterEnum
ALTER TYPE "ConnectorStatus" ADD VALUE 'DELETING';

-- AlterTable
ALTER TABLE "connector" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "scheduledDeletionAt" TIMESTAMP(3);
