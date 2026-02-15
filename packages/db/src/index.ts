import { PrismaClient } from "../prisma/generated/client";
import { instrumentPrisma } from "./instrumentation";

export * from "../prisma/generated/client";

export type Database = PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: Database | undefined;
};

function createPrismaClient(): Database {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  try {
    return instrumentPrisma(client);
  } catch (error) {
    console.error(
      "Prisma instrumentation failed:",
      error instanceof Error ? error.message : String(error)
    );
    return client;
  }
}

const prisma: Database = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const connectDb = async () => prisma;

export default prisma;

export * from "./lib/encryption";
export * from "./mutations/accounts";
export * from "./mutations/agent-canvas";
export * from "./mutations/agent-canvas-session";
export * from "./mutations/ai-usage";
export * from "./mutations/api-keys";
export * from "./mutations/audit-logs";
export * from "./mutations/background-agents";
export * from "./mutations/composition";
export * from "./mutations/connector-resources";
export * from "./mutations/connectors";
export * from "./mutations/conversations";
export * from "./mutations/entities";
export * from "./mutations/indexed-chunks";
export * from "./mutations/indexed-documents";
export * from "./mutations/indexed-files";
export * from "./mutations/indexed-media";
export * from "./mutations/knowledge-changes";
export * from "./mutations/mission-control";
export * from "./mutations/oauth";
export * from "./mutations/permissions";
export * from "./mutations/rag-interactions";
export * from "./mutations/saved-search";
export * from "./mutations/search-experiments";
export * from "./mutations/sessions";
export * from "./mutations/share-link";
export * from "./mutations/slack";
export * from "./mutations/sync";
export * from "./mutations/sync-history";
export * from "./mutations/team-media-index";
export * from "./mutations/teams";
export * from "./mutations/user-search-profile";
export * from "./mutations/users";
export * from "./mutations/workflow-audit";
export * from "./queries/accounts";
export * from "./queries/agent-canvas";
export * from "./queries/agent-canvas-session";
export * from "./queries/ai-usage";
export * from "./queries/api-keys";
export * from "./queries/audit-logs";
export * from "./queries/background-agents";
export * from "./queries/composition";
export * from "./queries/connector-resources";
export * from "./queries/connector-stats";
export * from "./queries/connectors";
export * from "./queries/conversations";
export * from "./queries/entities";
export * from "./queries/eval";
export * from "./queries/indexed-chunks";
export * from "./queries/indexed-documents";
export * from "./queries/indexed-files";
export * from "./queries/indexed-media";
export * from "./queries/knowledge-changes";
export * from "./queries/ltr";
export * from "./queries/mission-control";
export * from "./queries/permissions";
export * from "./queries/saved-search";
export * from "./queries/search-experiments";
export * from "./queries/sessions";
export * from "./queries/share-link";
export * from "./queries/slack";
export * from "./queries/sync";
export * from "./queries/sync-history";
export * from "./queries/team-media-index";
export * from "./queries/teams";
export * from "./queries/user-search-profile";
export * from "./queries/users";
export * from "./queries/workflow-audit";
