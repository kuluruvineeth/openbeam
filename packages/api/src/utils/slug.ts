import { type Database, findTeamBySlug } from "@openbeam/db";
import slugify from "@sindresorhus/slugify";

export async function generateUniqueSlug(
  prisma: Database,
  baseName: string
): Promise<string> {
  const baseSlug = slugify(baseName);

  const existing = await findTeamBySlug(prisma, baseSlug);

  if (!existing) {
    return baseSlug;
  }
  const MAX_ATTEMPTS = 100;
  let counter = 1;
  let candidateSlug = `${baseSlug}-${counter}`;

  while (counter <= MAX_ATTEMPTS) {
    const existingItem = await findTeamBySlug(prisma, candidateSlug);

    if (!existingItem) {
      return candidateSlug;
    }

    counter += 1;
    candidateSlug = `${baseSlug}-${counter}`;
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}
