import db, { updateLTRModel, updateLTRModelStatus } from "@openplane/db";
import type { UpdateLtrModelInput, UpdateLtrModelOutput } from "./types";

export async function updateLtrModel(
  input: UpdateLtrModelInput
): Promise<UpdateLtrModelOutput> {
  const {
    modelId,
    status,
    storagePath,
    metrics,
    featureImportance,
    trainingDurationMs,
  } = input;

  if (status === "failed") {
    await updateLTRModelStatus(db, modelId, "failed");
  } else {
    await updateLTRModel(db, modelId, {
      status,
      storagePath,
      metrics,
      featureImportance,
      trainingDurationMs,
    });
  }

  return { success: true };
}
