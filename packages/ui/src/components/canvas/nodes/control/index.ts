import { ConditionNode } from "./condition-node";
import { EndNode } from "./end-node";
import { LoopNode } from "./loop-node";
import { ParallelJoinNode } from "./parallel-join-node";
import { ParallelSplitNode } from "./parallel-split-node";
import { StartNode } from "./start-node";

export type { ConditionNodeData } from "./condition-node";
export { ConditionNode, createConditionNodeData } from "./condition-node";
export type { EndNodeData } from "./end-node";
export { createEndNodeData, EndNode } from "./end-node";
export type { LoopNodeData } from "./loop-node";
export { createLoopNodeData, LoopNode } from "./loop-node";
export type { ParallelJoinNodeData } from "./parallel-join-node";
export {
  createParallelJoinNodeData,
  ParallelJoinNode,
} from "./parallel-join-node";
export type { ParallelSplitNodeData } from "./parallel-split-node";
export {
  createParallelSplitNodeData,
  ParallelSplitNode,
} from "./parallel-split-node";
export type { StartNodeData } from "./start-node";
export { createStartNodeData, StartNode } from "./start-node";

export const controlNodeTypes = {
  start: StartNode,
  end: EndNode,
  condition: ConditionNode,
  loop: LoopNode,
  parallel_split: ParallelSplitNode,
  parallel_join: ParallelJoinNode,
} as const;
