import { TeamRole } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateTeamInput {
  name: string;
  slug: string;
  userId: string;
}

export const createTeam = async (
  db: Database,
  input: CreateTeamInput
): Promise<{ id: string; name: string; slug: string }> => {
  const result = await db.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        name: input.name,
        slug: input.slug,
      },
    });

    await tx.usersOnTeam.create({
      data: {
        userId: input.userId,
        teamId: team.id,
        role: TeamRole.OWNER,
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: { teamId: team.id },
    });

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
    };
  });

  return result;
};

export function countTeamOwners(db: Database, teamId: string) {
  return db.usersOnTeam.count({
    where: { teamId, role: "OWNER" },
  });
}

export function updateTeamMemberRole(
  db: Database,
  userId: string,
  teamId: string,
  role: "ADMIN" | "MEMBER"
) {
  return db.usersOnTeam.update({
    where: { userId_teamId: { userId, teamId } },
    data: { role },
  });
}

export function removeTeamMember(db: Database, userId: string, teamId: string) {
  return db.usersOnTeam.delete({
    where: { userId_teamId: { userId, teamId } },
  });
}
