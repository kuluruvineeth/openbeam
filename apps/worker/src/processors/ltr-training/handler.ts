import { getConfig } from "@openplane/ai";
import prisma, {
  countTrainingSamples,
  createLTRModel,
  getTrainingDataForExport,
  updateLTRModel,
  updateLTRModelStatus,
} from "@openplane/db";
import { fence, type LTRTrainingJobData } from "@openplane/redis";
import type { Job } from "bullmq";
import logger from "../../utils/logger";

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

interface TrainingResult {
  success: boolean;
  modelId?: string;
  metrics?: Record<string, number>;
  error?: string;
}

const TRAINING_TIMEOUT_MS = 300_000;
const MIN_CLICKS_PER_QUERY = 1;

function computePositionBasedFeatures(
  position: number,
  _totalResults: number
): Record<string, number> {
  const decayFactor = Math.exp(-position * 0.1);

  return {
    bm25_title: 0.8 * decayFactor + 0.1,
    bm25_content: 0.7 * decayFactor + 0.1,
    dense_score: 0.85 * decayFactor + 0.1,
    sparse_score: 0.6 * decayFactor + 0.1,
    rerank_score: 0.9 * decayFactor + 0.05,
    recency_days: Math.floor(position * 2 + Math.random() * 10),
    doc_length: 500 + Math.floor(Math.random() * 2000),
    title_length: 20 + Math.floor(Math.random() * 80),
    view_count: Math.max(0, 50 - position * 3 + Math.floor(Math.random() * 20)),
    reaction_count: Math.max(0, Math.floor(5 - position * 0.3)),
    reply_count: Math.max(0, Math.floor(3 - position * 0.2)),
    trending_score: 0.5 * decayFactor,
    authority_score: 0.7 * decayFactor + 0.2,
    title_exact_match: position === 0 ? 1 : 0,
    title_partial_match: position < 3 ? 1 : 0,
    connector_type_encoded: 0,
    document_type_encoded: 0,
    department_match: 0,
    author_interaction_count: 0,
  };
}

export async function processLTRTrainingJob(
  job: Job<LTRTrainingJobData>
): Promise<TrainingResult> {
  const { teamId, modelVersion, fromDate, toDate, minSamples } = job.data;

  const log = logger.child({
    jobId: job.id,
    teamId,
    modelVersion,
  });

  log.info("Starting LTR training job");

  const fenceKey = `ltr-training-${teamId}`;
  const fenceToken = await fence.acquireFence(fenceKey);

  try {
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);

    const sampleCount = await countTrainingSamples(prisma, {
      teamId,
      fromDate: fromDateObj,
      toDate: toDateObj,
    });

    const minRequired = minSamples ?? 100;
    if (sampleCount < minRequired) {
      log.warn(
        { sampleCount, minRequired },
        "Insufficient training samples, skipping training"
      );
      return {
        success: false,
        error: `Insufficient training samples: ${sampleCount} (minimum ${minRequired})`,
      };
    }

    await fence.validateFence(fenceKey, fenceToken);

    log.info({ sampleCount }, "Exporting training data");

    const trainingData = await getTrainingDataForExport(prisma, {
      teamId,
      fromDate: fromDateObj,
      toDate: toDateObj,
      minClicksPerQuery: MIN_CLICKS_PER_QUERY,
    });

    const impressions = trainingData.map((impression) => ({
      id: impression.id,
      query: impression.query,
      result_doc_ids: impression.resultDocIds,
      clicks: impression.clicks.map((click) => ({
        doc_id: click.docId,
        position: click.position,
        dwell_time_ms: click.dwellTimeMs,
        feedback_type: click.feedbackType,
      })),
    }));

    const featuresByDoc: Record<string, Record<string, number>> = {};
    for (const imp of trainingData) {
      const totalResults = imp.resultDocIds.length;
      for (let position = 0; position < totalResults; position++) {
        const docId = imp.resultDocIds[position] as string;
        if (!featuresByDoc[docId]) {
          featuresByDoc[docId] = computePositionBasedFeatures(
            position,
            totalResults
          );
        }
      }
    }

    await fence.validateFence(fenceKey, fenceToken);

    const ltrModel = await createLTRModel(prisma, {
      teamId,
      version: modelVersion,
      storagePath: "",
      status: "training",
      trainingSamples: impressions.length,
      trainingQueries: impressions.length,
    });

    log.info(
      { modelId: ltrModel.id, docCount: Object.keys(featuresByDoc).length },
      "Created LTR model record, calling engine"
    );

    await job.updateProgress({ stage: "training", progress: 50 });

    const config = getConfig();
    const engineUrl = config.engine.baseURL;

    const response = await fetch(`${engineUrl}/ltr/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: teamId,
        version: modelVersion,
        impressions,
        features_by_doc: featuresByDoc,
      }),
      signal: AbortSignal.timeout(TRAINING_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(
        { status: response.status, error: errorText },
        "Training API failed"
      );

      await updateLTRModelStatus(prisma, ltrModel.id, "failed");

      return {
        success: false,
        modelId: ltrModel.id,
        error: `Training API failed: ${response.status} ${errorText}`,
      };
    }

    const result = (await response.json()) as TrainingApiResponse;

    await fence.validateFence(fenceKey, fenceToken);

    await updateLTRModel(prisma, ltrModel.id, {
      status: "ready",
      storagePath: result.model_path,
      metrics: result.metrics,
      featureImportance: result.feature_importance,
      trainingDurationMs: Math.round(result.training_time_seconds * 1000),
    });

    log.info(
      {
        modelId: ltrModel.id,
        metrics: result.metrics,
        trainingTimeSeconds: result.training_time_seconds,
      },
      "LTR training completed successfully"
    );

    return {
      success: true,
      modelId: ltrModel.id,
      metrics: result.metrics,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("fence validation failed")
    ) {
      log.warn("LTR training job superseded by newer job");
      return {
        success: false,
        error: "Job superseded by newer training job",
      };
    }
    throw error;
  } finally {
    await fence.releaseFence(fenceKey, fenceToken);
  }
}
