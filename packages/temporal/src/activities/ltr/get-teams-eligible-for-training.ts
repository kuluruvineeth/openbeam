import db, {
  getTeamsEligibleForTraining as getTeamsQuery,
} from "@openplane/db";
import type {
  GetTeamsEligibleForTrainingInput,
  GetTeamsEligibleForTrainingOutput,
} from "./types";

export async function getTeamsEligibleForTraining(
  input: GetTeamsEligibleForTrainingInput
): Promise<GetTeamsEligibleForTrainingOutput> {
  const teamIds = await getTeamsQuery(db, {
    minSamples: input.minSamples,
    fromDate: new Date(input.fromDate),
    toDate: new Date(input.toDate),
  });

  return { teamIds };
}
