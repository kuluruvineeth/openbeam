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
  } catch {
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
export * from "./mutations/audit-logs";
export * from "./mutations/connector-resources";
export * from "./mutations/connectors";
export * from "./mutations/entities";
export * from "./mutations/indexed-chunks";
export * from "./mutations/indexed-documents";
export * from "./mutations/indexed-files";
export * from "./mutations/indexed-media";
export * from "./mutations/oauth";
export * from "./mutations/search-experiments";
export * from "./mutations/sessions";
export * from "./mutations/slack";
export * from "./mutations/sync";
export * from "./mutations/sync-history";
export * from "./mutations/team-media-index";
export * from "./mutations/teams";
export * from "./mutations/users";
export * from "./queries/accounts";
export * from "./queries/api-keys";
export * from "./queries/audit-logs";
export * from "./queries/connector-resources";
export * from "./queries/connectors";
export * from "./queries/entities";
export * from "./queries/indexed-chunks";
export * from "./queries/indexed-documents";
export * from "./queries/indexed-files";
export * from "./queries/indexed-media";
export * from "./queries/search-experiments";
export * from "./queries/sessions";
export * from "./queries/slack";
export * from "./queries/sync";
export * from "./queries/sync-history";
export * from "./queries/team-media-index";
export * from "./queries/teams";
export * from "./queries/users";
