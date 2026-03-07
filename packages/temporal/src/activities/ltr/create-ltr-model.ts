import db, { createLTRModel } from "@openbeam/db";
import type { CreateLtrModelInput, CreateLtrModelOutput } from "./types";

export async function createLtrModel(
  input: CreateLtrModelInput
): Promise<CreateLtrModelOutput> {
  const { teamId, version, trainingSamples, trainingQueries } = input;

  const model = await createLTRModel(db, {
    teamId,
    version,
    storagePath: "",
    status: "training",
    trainingSamples,
    trainingQueries,
  });

  return { modelId: model.id };
}
