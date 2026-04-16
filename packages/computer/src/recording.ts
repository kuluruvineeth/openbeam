import type { Database } from "@openbeam/db";
import { insertComputerRunSteps } from "@openbeam/db";
import type { StepRecord } from "@openbeam/types/computer";

export async function persistSteps(
  db: Database,
  runId: string,
  steps: StepRecord[]
): Promise<void> {
  if (steps.length === 0) {
    return;
  }
  await insertComputerRunSteps(db, runId, steps);
}
