import db, { countTrainingSamples as countSamples } from "@openplane/db";
import type {
  CountTrainingSamplesInput,
  CountTrainingSamplesOutput,
} from "./types";

export async function countTrainingSamples(
  input: CountTrainingSamplesInput
): Promise<CountTrainingSamplesOutput> {
  const { teamId, fromDate, toDate } = input;

  const count = await countSamples(db, {
    teamId,
    fromDate: new Date(fromDate),
    toDate: new Date(toDate),
  });

  return { count };
}
