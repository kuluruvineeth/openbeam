export interface GetTeamsEligibleForTrainingInput {
  minSamples: number;
  fromDate: string;
  toDate: string;
}

export interface GetTeamsEligibleForTrainingOutput {
  teamIds: string[];
}

export interface CountTrainingSamplesInput {
  teamId: string;
  fromDate: string;
  toDate: string;
}

export interface CountTrainingSamplesOutput {
  count: number;
}

export interface ExportTrainingDataInput {
  teamId: string;
  fromDate: string;
  toDate: string;
  minClicksPerQuery?: number;
}

export interface TrainingClick {
  docId: string;
  position: number;
  dwellTimeMs: number | null;
  feedbackType: string | null;
}

export interface TrainingImpression {
  id: string;
  query: string;
  resultDocIds: string[];
  clicks: TrainingClick[];
}

export interface ExportTrainingDataOutput {
  impressions: TrainingImpression[];
  featuresByDoc: Record<string, Record<string, number>>;
}

export interface CreateLtrModelInput {
  teamId: string;
  version: string;
  trainingSamples: number;
  trainingQueries: number;
}

export interface CreateLtrModelOutput {
  modelId: string;
}

export interface TrainLtrModelInput {
  teamId: string;
  modelId: string;
  version: string;
  impressions: TrainingImpression[];
  featuresByDoc: Record<string, Record<string, number>>;
}

export interface TrainLtrModelOutput {
  success: boolean;
  modelPath?: string;
  metrics?: Record<string, number>;
  featureImportance?: Record<string, number>;
  trainingTimeSeconds?: number;
  error?: string;
}

export interface UpdateLtrModelInput {
  modelId: string;
  status: "ready" | "failed";
  storagePath?: string;
  metrics?: Record<string, number>;
  featureImportance?: Record<string, number>;
  trainingDurationMs?: number;
}

export interface UpdateLtrModelOutput {
  success: boolean;
}

export interface LtrTrainingActivities {
  getTeamsEligibleForTraining(
    input: GetTeamsEligibleForTrainingInput
  ): Promise<GetTeamsEligibleForTrainingOutput>;
  countTrainingSamples(
    input: CountTrainingSamplesInput
  ): Promise<CountTrainingSamplesOutput>;
  exportTrainingData(
    input: ExportTrainingDataInput
  ): Promise<ExportTrainingDataOutput>;
  createLtrModel(input: CreateLtrModelInput): Promise<CreateLtrModelOutput>;
  trainLtrModel(input: TrainLtrModelInput): Promise<TrainLtrModelOutput>;
  updateLtrModel(input: UpdateLtrModelInput): Promise<UpdateLtrModelOutput>;
}
