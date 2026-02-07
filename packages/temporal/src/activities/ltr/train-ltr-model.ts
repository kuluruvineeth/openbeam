import { getConfig } from "@openplane/ai";
import type { TrainLtrModelInput, TrainLtrModelOutput } from "./types";

interface TrainingApiResponse {
  success: boolean;
  version: string;
  model_path: string;
  metrics: Record<string, number>;
  feature_importance: Record<string, number>;
  training_time_seconds: number;
  num_queries: number;
  num_documents: number;
}

const TRAINING_TIMEOUT_MS = 300_000;

export async function trainLtrModel(
  input: TrainLtrModelInput
): Promise<TrainLtrModelOutput> {
  const { teamId, version, impressions, featuresByDoc } = input;

  const config = getConfig();
  const engineUrl = config.engine.baseURL;

  const requestBody = {
    team_id: teamId,
    version,
    impressions: impressions.map((imp) => ({
      id: imp.id,
      query: imp.query,
      result_doc_ids: imp.resultDocIds,
      clicks: imp.clicks.map((click) => ({
        doc_id: click.docId,
        position: click.position,
        dwell_time_ms: click.dwellTimeMs,
        feedback_type: click.feedbackType,
      })),
    })),
    features_by_doc: featuresByDoc,
  };

  const response = await fetch(`${engineUrl}/v1/ltr/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(TRAINING_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `Training API failed: ${response.status} ${errorText}`,
    };
  }

  const result = (await response.json()) as TrainingApiResponse;

  return {
    success: true,
    modelPath: result.model_path,
    metrics: result.metrics,
    featureImportance: result.feature_importance,
    trainingTimeSeconds: result.training_time_seconds,
  };
}
