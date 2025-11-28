-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppType" ADD VALUE 'GMAIL';
ALTER TYPE "AppType" ADD VALUE 'OUTLOOK';
ALTER TYPE "AppType" ADD VALUE 'CONFLUENCE';
ALTER TYPE "AppType" ADD VALUE 'CODA';
ALTER TYPE "AppType" ADD VALUE 'MONDAY';
ALTER TYPE "AppType" ADD VALUE 'BASECAMP';
ALTER TYPE "AppType" ADD VALUE 'GITLAB';
ALTER TYPE "AppType" ADD VALUE 'BITBUCKET';
ALTER TYPE "AppType" ADD VALUE 'PIPEDRIVE';
ALTER TYPE "AppType" ADD VALUE 'TABLEAU';
ALTER TYPE "AppType" ADD VALUE 'LOOKER';
ALTER TYPE "AppType" ADD VALUE 'OKTA';
ALTER TYPE "AppType" ADD VALUE 'AZURE_AD';
ALTER TYPE "AppType" ADD VALUE 'GOOGLE_WORKSPACE';
ALTER TYPE "AppType" ADD VALUE 'GOOGLE_CALENDAR';
ALTER TYPE "AppType" ADD VALUE 'OUTLOOK_CALENDAR';
ALTER TYPE "AppType" ADD VALUE 'FIGMA';
ALTER TYPE "AppType" ADD VALUE 'MIRO';
ALTER TYPE "AppType" ADD VALUE 'LOOM';
ALTER TYPE "AppType" ADD VALUE 'ZOOM';
ALTER TYPE "AppType" ADD VALUE 'GENERIC_API';
ALTER TYPE "AppType" ADD VALUE 'WEBHOOK';
ALTER TYPE "AppType" ADD VALUE 'RSS';
ALTER TYPE "AppType" ADD VALUE 'CUSTOM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthType" ADD VALUE 'SERVICE_ACCOUNT';
ALTER TYPE "AuthType" ADD VALUE 'TOKEN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConnectorStatus" ADD VALUE 'PAUSED';
ALTER TYPE "ConnectorStatus" ADD VALUE 'RATE_LIMITED';
ALTER TYPE "ConnectorStatus" ADD VALUE 'AUTH_EXPIRED';

-- AlterEnum
ALTER TYPE "ConnectorType" ADD VALUE 'BIDIRECTIONAL';
