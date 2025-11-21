import path from "node:path";
import dotenv from "dotenv";
import type { PrismaConfig } from "prisma";

// Load environment variables from server .env
dotenv.config({
  path: "../../apps/server/.env",
});

export default {
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
} satisfies PrismaConfig;
