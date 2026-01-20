import { ClassifyNode } from "./classify-node";
import { ExtractNode } from "./extract-node";
import { LlmNode } from "./llm-node";
import { RagNode } from "./rag-node";
import { SummarizeNode } from "./summarize-node";

export type { ClassifyCategory, ClassifyNodeData } from "./classify-node";
export { ClassifyNode, createClassifyNodeData } from "./classify-node";
export type { ExtractField, ExtractNodeData } from "./extract-node";
export { createExtractNodeData, ExtractNode } from "./extract-node";
export type { LlmNodeData } from "./llm-node";
export { createLlmNodeData, LlmNode } from "./llm-node";
export type { RagNodeData } from "./rag-node";
export { createRagNodeData, RagNode } from "./rag-node";
export type { SummarizeNodeData } from "./summarize-node";
export { createSummarizeNodeData, SummarizeNode } from "./summarize-node";

export const aiNodeTypes = {
  llm: LlmNode,
  rag: RagNode,
  summarize: SummarizeNode,
  extract: ExtractNode,
  classify: ClassifyNode,
} as const;
