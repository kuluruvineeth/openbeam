import { PrismaClient } from "../prisma/generated/client";

export * from "../prisma/generated/client";

const prisma = new PrismaClient();

export const connectDb = async () => prisma;

export type Database = PrismaClient;

export default prisma;

// Mutation layer
export * from "./mutations/connectors";
export * from "./mutations/oauth";
// Query layer
export * from "./queries/connectors";
