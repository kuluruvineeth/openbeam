import type { Database } from "..";

export const listUserOrganizations = async (db: Database, userId: string) => {
  const memberships = await db.member.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    logoUrl: membership.organization.logo ?? null,
  }));
};

export const updateActiveOrganizationForUser = async (
  db: Database,
  userId: string,
  organizationId: string
) => {
  await db.session.updateMany({
    where: {
      userId,
    },
    data: {
      activeOrganizationId: organizationId,
    },
  });
};
