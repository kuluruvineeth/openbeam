import { AnnotationNode } from "./annotation-node";
import { ApprovalNode } from "./approval-node";
import { InputNode } from "./input-node";

export type {
  AnnotationColor,
  AnnotationNodeConfig,
  AnnotationNodeData,
} from "./annotation-node";
export { AnnotationNode, createAnnotationNodeData } from "./annotation-node";
export type {
  ApprovalNodeConfig,
  ApprovalNodeData,
  Approver,
} from "./approval-node";
export { ApprovalNode, createApprovalNodeData } from "./approval-node";
export type {
  InputNodeConfig,
  InputNodeData,
  InputOption,
  InputType,
} from "./input-node";
export { createInputNodeData, InputNode } from "./input-node";

export const humanNodeTypes = {
  approval: ApprovalNode,
  input: InputNode,
  annotation: AnnotationNode,
} as const;
