import type { Database } from "@openplane/db";
import slugify from "@sindresorhus/slugify";

export async function generateUniqueSlug(
  prisma: Database,
  baseName: string
): Promise<string> {
  const baseSlug = slugify(baseName);

  const existingOrg = await prisma.organization.findUnique({
    where: { slug: baseSlug },
  });

  if (!existingOrg) {
    return baseSlug;
  }

  // If slug exists, try with numeric suffix
  let counter = 1;
  let candidateSlug = `${baseSlug}-${counter}`;

  // Keep incrementing until we find a unique slug
  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug: candidateSlug },
    });

    if (!existing) {
      return candidateSlug;
    }

    counter += 1;
    candidateSlug = `${baseSlug}-${counter}`;
  }
}
