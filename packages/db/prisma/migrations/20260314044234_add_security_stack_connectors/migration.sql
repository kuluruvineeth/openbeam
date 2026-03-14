-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppType" ADD VALUE 'NVD';
ALTER TYPE "AppType" ADD VALUE 'CISA_KEV';
ALTER TYPE "AppType" ADD VALUE 'MITRE_ATTACK';
ALTER TYPE "AppType" ADD VALUE 'OWASP';

-- AlterEnum
ALTER TYPE "AuthType" ADD VALUE 'PUBLIC_DATASET';
