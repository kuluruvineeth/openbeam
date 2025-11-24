import { PrismaClient } from "../prisma/generated/client";

export * from "../prisma/generated/client";

const prisma = new PrismaClient();

export const connectDb = async () => prisma;

export type Database = PrismaClient;

export default prisma;

// Mutation layer
// Note: api-keys mutations are not exported here to avoid pulling argon2 into client bundles
// Import directly from "./mutations/api-keys" in server-side code only
export * from "./mutations/connectors";
export * from "./mutations/oauth";
export * from "./mutations/sync";
export * from "./mutations/teams";
// Query layer
export * from "./queries/connectors";
export * from "./queries/sync";
export * from "./queries/teams";
