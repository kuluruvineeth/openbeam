-- Replace legacy sandbox enum values with Daytona-first values.
CREATE TYPE "SandboxType_new" AS ENUM ('DAYTONA', 'LOCAL');

ALTER TABLE "background_agent"
ALTER COLUMN "sandboxType" DROP DEFAULT,
ALTER COLUMN "sandboxType" TYPE "SandboxType_new"
USING (
  CASE
    WHEN "sandboxType"::text IN ('E2B', 'DOCKER') THEN 'DAYTONA'
    WHEN "sandboxType"::text = 'LOCAL' THEN 'LOCAL'
    ELSE 'DAYTONA'
  END
)::"SandboxType_new";

DROP TYPE "SandboxType";
ALTER TYPE "SandboxType_new" RENAME TO "SandboxType";

ALTER TABLE "background_agent"
ALTER COLUMN "sandboxType" SET DEFAULT 'DAYTONA';
