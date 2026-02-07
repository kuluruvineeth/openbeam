import db, { getAIUsageLogsForExport } from "@openplane/db";
import type { GetLogsForExportInput, GetLogsForExportOutput } from "./types";

export async function getLogsForExport(
  input: GetLogsForExportInput
): Promise<GetLogsForExportOutput> {
  const { teamId, date } = input;

  const logs = await getAIUsageLogsForExport(db, teamId, date);

  return { logs };
}
