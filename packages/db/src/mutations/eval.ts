import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export function updateExecutionEval(
  db: Database,
  executionId: string,
  teamId: string,
  data: {
    evalScore: number;
    evalDimensions: unknown;
    evalFlags: string[];
  }
) {
  return db.$transaction(async (tx) => {
    const execution = await tx.agentCanvasExecution.findFirst({
      where: { id: executionId, agentCanvas: { teamId } },
      select: { id: true },
    });

    if (!execution) {
      throw new Error("Execution not found");
    }

    return tx.agentCanvasExecution.update({
      where: { id: execution.id },
      data: {
        evalScore: data.evalScore,
        evalDimensions: data.evalDimensions as Prisma.InputJsonValue,
        evalFlags: data.evalFlags,
      },
    });
  });
}
