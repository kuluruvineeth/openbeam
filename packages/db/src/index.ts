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
export * from "./mutations/connector-resources";
export * from "./mutations/connectors";
export * from "./mutations/oauth";
export * from "./mutations/sync";
export * from "./mutations/sync-history";
export * from "./mutations/teams";
export * from "./queries/connector-resources";
export * from "./queries/connectors";
export * from "./queries/sync";
export * from "./queries/sync-history";
export * from "./queries/teams";
