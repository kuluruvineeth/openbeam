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

import { controlNodeTypes as _controlNodeTypes } from "./control";

export function createAllNodeTypes() {
  return {
    ..._controlNodeTypes,
  };
}
