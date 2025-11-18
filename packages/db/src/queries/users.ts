import type { Database } from "..";

export const getUserById = async (db: Database, id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const primaryMembership = user.members[0];

  return {
    ...user,
    organizationId: primaryMembership?.organizationId ?? null,
    organization: primaryMembership?.organization ?? null,
  };
};
