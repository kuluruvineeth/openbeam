import { PrismaClient } from "../prisma/generated/client";
import { instrumentPrisma } from "./instrumentation";

export * from "../prisma/generated/client";

const prismaClient = new PrismaClient();

let prisma: PrismaClient;
try {
  prisma = instrumentPrisma(prismaClient);
} catch {
  prisma = prismaClient;
}

export const connectDb = async () => prisma;

export type Database = PrismaClient;

export default prisma;

// Mutations
export * from "./mutations/actions";
export * from "./mutations/ai";
export * from "./mutations/analytics";
export * from "./mutations/connectors";
export * from "./mutations/entities";
export * from "./mutations/exports";
export * from "./mutations/notifications";
export * from "./mutations/oauth";
export * from "./mutations/permissions";
export * from "./mutations/sync";
export * from "./mutations/teams";

// Queries
export * from "./queries/actions";
export * from "./queries/ai";
export * from "./queries/analytics";
export * from "./queries/connectors";
export * from "./queries/entities";
export * from "./queries/exports";
export * from "./queries/notifications";
export * from "./queries/permissions";
export * from "./queries/sync";
export * from "./queries/teams";
export * from "./queries/users";
