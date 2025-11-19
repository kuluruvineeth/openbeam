import { PrismaClient } from "../prisma/generated/client";

export * from "../prisma/generated/client";

const prisma = new PrismaClient();

export const connectDb = async () => prisma;

export type Database = PrismaClient;

export default prisma;
