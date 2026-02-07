import db, { getTeamsWithAIUsageForDate } from "@openplane/db";
import type { GetTeamsWithUsageInput, GetTeamsWithUsageOutput } from "./types";

export async function getTeamsWithUsage(
  input: GetTeamsWithUsageInput
): Promise<GetTeamsWithUsageOutput> {
  const { date } = input;

  const teamIds = await getTeamsWithAIUsageForDate(db, date);

  return { teamIds };
}
