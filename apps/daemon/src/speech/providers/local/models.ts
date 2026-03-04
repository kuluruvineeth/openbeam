import {
  DEFAULT_LOCAL_STT_MODEL,
  DEFAULT_LOCAL_TTS_MODEL,
  type LocalSpeechModelId,
  type LocalSttModelId,
  LocalSttModelIdSchema,
  type LocalTtsModelId,
  LocalTtsModelIdSchema,
  listSherpaOnnxModels,
} from "./sherpa/model-catalog";
import {
  ensureSherpaOnnxModels,
  getSherpaOnnxModelDir,
} from "./sherpa/model-downloader";

export {
  DEFAULT_LOCAL_STT_MODEL,
  DEFAULT_LOCAL_TTS_MODEL,
  LocalSttModelIdSchema,
  LocalTtsModelIdSchema,
  type LocalSpeechModelId,
  type LocalSttModelId,
  type LocalTtsModelId,
};

export type LocalSpeechModelSpec = ReturnType<
  typeof listSherpaOnnxModels
>[number];

export function listLocalSpeechModels(): LocalSpeechModelSpec[] {
  return listSherpaOnnxModels();
}

export function getLocalSpeechModelDir(
  modelsDir: string,
  modelId: LocalSpeechModelId
): string {
  return getSherpaOnnxModelDir(modelsDir, modelId);
}

// biome-ignore lint/suspicious/useAwait: async signature required by interface
export async function ensureLocalSpeechModels(options: {
  modelsDir: string;
  modelIds: LocalSpeechModelId[];
  logger: import("pino").Logger;
}): Promise<Record<LocalSpeechModelId, string>> {
  return ensureSherpaOnnxModels({
    modelsDir: options.modelsDir,
    modelIds: options.modelIds,
    logger: options.logger,
  });
}
