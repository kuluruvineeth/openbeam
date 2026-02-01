import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(__dirname, "../../../../db/prisma/schema");

export async function getPrismaSchema(): Promise<string> {
  const files = await readdir(SCHEMA_DIR);
  const prismaFiles = files.filter((f) => f.endsWith(".prisma")).sort();

  const schemas: string[] = [];

  for (const file of prismaFiles) {
    const content = await readFile(join(SCHEMA_DIR, file), "utf-8");
    schemas.push(`// === ${file} ===\n${content}`);
  }

  return schemas.join("\n\n");
}
