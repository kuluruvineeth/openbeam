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

export * from "./lib/encryption";
export * from "./mutations/connectors";
export * from "./mutations/oauth";
export * from "./mutations/sync";
export * from "./mutations/teams";
export * from "./queries/connectors";
export * from "./queries/sync";
export * from "./queries/teams";
