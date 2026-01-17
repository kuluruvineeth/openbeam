export type {
  ClassifyCategory,
  ClassifyNodeConfig,
  ClassifyNodeData,
  ExtractField,
  ExtractNodeConfig,
  ExtractNodeData,
  LlmNodeConfig,
  LlmNodeData,
  RagNodeConfig,
  RagNodeData,
  SummarizeNodeConfig,
  SummarizeNodeData,
} from "./ai";
export {
  aiNodeTypes,
  ClassifyNode,
  createClassifyNodeData,
  createExtractNodeData,
  createLlmNodeData,
  createRagNodeData,
  createSummarizeNodeData,
  ExtractNode,
  LlmNode,
  RagNode,
  SummarizeNode,
} from "./ai";
export type { BaseNodeData, NodePortDefinition } from "./base-node";
export { BaseNode } from "./base-node";
export type {
  ConditionNodeConfig,
  ConditionNodeData,
  EndNodeConfig,
  EndNodeData,
  LoopNodeConfig,
  LoopNodeData,
  ParallelJoinNodeConfig,
  ParallelJoinNodeData,
  ParallelSplitNodeConfig,
  ParallelSplitNodeData,
  StartNodeConfig,
  StartNodeData,
} from "./control";
export {
  ConditionNode,
  controlNodeTypes,
  createConditionNodeData,
  createEndNodeData,
  createLoopNodeData,
  createParallelJoinNodeData,
  createParallelSplitNodeData,
  createStartNodeData,
  EndNode,
  LoopNode,
  ParallelJoinNode,
  ParallelSplitNode,
  StartNode,
} from "./control";
export type {
  AnnotationColor,
  AnnotationNodeConfig,
  AnnotationNodeData,
  ApprovalNodeConfig,
  ApprovalNodeData,
  Approver,
  InputNodeConfig,
  InputNodeData,
  InputOption,
  InputType,
  NotifyNodeConfig,
  NotifyNodeData,
} from "./human";
export {
  AnnotationNode,
  ApprovalNode,
  createAnnotationNodeData,
  createApprovalNodeData,
  createInputNodeData,
  createNotifyNodeData,
  humanNodeTypes,
  InputNode,
  NotifyNode,
} from "./human";
export type {
  CodeNodeConfig,
  CodeNodeData,
  FilterNodeConfig,
  FilterNodeData,
  TemplateNodeConfig,
  TemplateNodeData,
} from "./transform";
export {
  CodeNode,
  createCodeNodeData,
  createFilterNodeData,
  createTemplateNodeData,
  FilterNode,
  TemplateNode,
  transformNodeTypes,
} from "./transform";

import { aiNodeTypes as _aiNodeTypes } from "./ai";
import { controlNodeTypes as _controlNodeTypes } from "./control";
import { humanNodeTypes as _humanNodeTypes } from "./human";
import { transformNodeTypes as _transformNodeTypes } from "./transform";

export function createAllNodeTypes() {
  return {
    ..._controlNodeTypes,
    ..._aiNodeTypes,
    ..._transformNodeTypes,
    ..._humanNodeTypes,
  };
}
