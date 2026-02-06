import type { Database } from "../index";

export function getAgentPolicy(db: Database, teamId: string) {
  return db.agentPolicy.findUnique({
    where: { teamId },
  });
}

export function countActiveExecutions(
  db: Database,
  teamId: string
): Promise<number> {
  return db.agentCanvasExecution.count({
    where: {
      agentCanvas: { teamId },
      status: {
        in: ["PENDING", "RUNNING", "WAITING_APPROVAL", "WAITING_INPUT"],
      },
    },
  });
}
