import { AnnotationNode } from "./annotation-node";
import { ApprovalNode } from "./approval-node";
import { InputNode } from "./input-node";
import { NotifyNode } from "./notify-node";

export type {
  AnnotationColor,
  AnnotationNodeConfig,
  AnnotationNodeData,
} from "./annotation-node";
export { AnnotationNode, createAnnotationNodeData } from "./annotation-node";
export type { ApprovalNodeData } from "./approval-node";
export { ApprovalNode, createApprovalNodeData } from "./approval-node";
export type { InputNodeData } from "./input-node";
export { createInputNodeData, InputNode } from "./input-node";
export type { NotifyNodeConfig, NotifyNodeData } from "./notify-node";
export { createNotifyNodeData, NotifyNode } from "./notify-node";

export const humanNodeTypes = {
  approval: ApprovalNode,
  input: InputNode,
  notify: NotifyNode,
  annotation: AnnotationNode,
} as const;
