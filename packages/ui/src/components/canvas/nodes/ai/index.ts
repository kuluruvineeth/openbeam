import { AudioNode } from "./audio-node";
import { ClassifyNode } from "./classify-node";
import { ExtractNode } from "./extract-node";
import { ImageNode } from "./image-node";
import { LlmNode } from "./llm-node";
import { RagNode } from "./rag-node";
import { SummarizeNode } from "./summarize-node";
import { VideoNode } from "./video-node";

export type { AudioNodeData, AudioNodeProps } from "./audio-node";
export { AudioNode, createAudioNodeData } from "./audio-node";
export type { ClassifyNodeData } from "./classify-node";
export { ClassifyNode, createClassifyNodeData } from "./classify-node";
export type { ExtractNodeData, ExtractNodeProps } from "./extract-node";
export { createExtractNodeData, ExtractNode } from "./extract-node";
export type { ImageNodeData, ImageNodeProps } from "./image-node";
export { createImageNodeData, ImageNode } from "./image-node";
export type { LlmNodeData, LlmNodeProps } from "./llm-node";
export { createLlmNodeData, LlmNode } from "./llm-node";
export type { RagNodeData } from "./rag-node";
export { createRagNodeData, RagNode } from "./rag-node";
export type { SummarizeNodeData } from "./summarize-node";
export { createSummarizeNodeData, SummarizeNode } from "./summarize-node";
export type { VideoNodeData, VideoNodeProps } from "./video-node";
export { createVideoNodeData, VideoNode } from "./video-node";

export const aiNodeTypes = {
  llm: LlmNode,
  rag: RagNode,
  summarize: SummarizeNode,
  extract: ExtractNode,
  classify: ClassifyNode,
  image: ImageNode,
  audio: AudioNode,
  video: VideoNode,
} as const;
