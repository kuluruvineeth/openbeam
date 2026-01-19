import type { CanvasNodeType } from "@openplane/types/canvas";

import {
  createClassifyNodeData,
  createExtractNodeData,
  createLlmNodeData,
  createRagNodeData,
  createSummarizeNodeData,
} from "./ai";
import {
  createConditionNodeData,
  createEndNodeData,
  createLoopNodeData,
  createParallelJoinNodeData,
  createParallelSplitNodeData,
  createStartNodeData,
} from "./control";
import {
  createAnnotationNodeData,
  createApprovalNodeData,
  createInputNodeData,
  createNotifyNodeData,
} from "./human";
import {
  createCodeNodeData,
  createFilterNodeData,
  createTemplateNodeData,
} from "./transform";

type NodeDataFactory = () => Record<string, unknown>;

const nodeDataFactories: Record<string, NodeDataFactory> = {
  start: createStartNodeData,
  end: createEndNodeData,
  condition: createConditionNodeData,
  loop: createLoopNodeData,
  parallel_split: createParallelSplitNodeData,
  parallel_join: createParallelJoinNodeData,

  llm: createLlmNodeData,
  rag: createRagNodeData,
  summarize: createSummarizeNodeData,
  extract: createExtractNodeData,
  classify: createClassifyNodeData,

  template: createTemplateNodeData,
  code: createCodeNodeData,
  filter: createFilterNodeData,

  approval: createApprovalNodeData,
  input: createInputNodeData,
  notify: createNotifyNodeData,
  annotation: createAnnotationNodeData,
};

export function createNodeData(
  nodeType: CanvasNodeType | string
): Record<string, unknown> {
  const factory = nodeDataFactories[nodeType];
  if (!factory) {
    return {
      label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
      config: {},
    };
  }
  return factory();
}

export function hasNodeDataFactory(nodeType: string): boolean {
  return nodeType in nodeDataFactories;
}

export {
  createClassifyNodeData,
  createCodeNodeData,
  createConditionNodeData,
  createEndNodeData,
  createExtractNodeData,
  createFilterNodeData,
  createLlmNodeData,
  createLoopNodeData,
  createParallelJoinNodeData,
  createParallelSplitNodeData,
  createRagNodeData,
  createStartNodeData,
  createSummarizeNodeData,
  createTemplateNodeData,
  createAnnotationNodeData,
  createApprovalNodeData,
  createInputNodeData,
  createNotifyNodeData,
};
