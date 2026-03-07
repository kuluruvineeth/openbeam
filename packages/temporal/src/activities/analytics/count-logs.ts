import db, { countAIUsageLogsForDate } from "@openbeam/db";
import type {
  CountLogsForExportInput,
  CountLogsForExportOutput,
} from "./types";

export async function countLogsForExport(
  input: CountLogsForExportInput
): Promise<CountLogsForExportOutput> {
  const { teamId, date } = input;

  const count = await countAIUsageLogsForDate(db, teamId, date);

  return { count };
}
