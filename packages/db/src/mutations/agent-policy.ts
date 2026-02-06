import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface UpsertAgentPolicyInput {
  teamId: string;
  policy: Prisma.InputJsonValue;
  enabled?: boolean;
  createdBy: string;
}

export function upsertAgentPolicy(db: Database, input: UpsertAgentPolicyInput) {
  return db.agentPolicy.upsert({
    where: { teamId: input.teamId },
    create: {
      teamId: input.teamId,
      policy: input.policy,
      enabled: input.enabled ?? true,
      createdBy: input.createdBy,
    },
    update: {
      policy: input.policy,
      enabled: input.enabled,
    },
  });
}

export function deleteAgentPolicy(db: Database, teamId: string) {
  return db.agentPolicy.delete({
    where: { teamId },
  });
}
