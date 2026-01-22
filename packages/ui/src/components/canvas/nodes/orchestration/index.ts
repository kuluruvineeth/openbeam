import { AgentCallNode } from "./agent-call-node";
import { ParallelMapNode } from "./parallel-map-node";
import { SubWorkflowNode } from "./sub-workflow-node";

export type { AgentCallNodeData } from "./agent-call-node";
export { AgentCallNode } from "./agent-call-node";

export type { ParallelMapNodeData } from "./parallel-map-node";
export { ParallelMapNode } from "./parallel-map-node";

export type { SubWorkflowNodeData } from "./sub-workflow-node";
export { SubWorkflowNode } from "./sub-workflow-node";

export const orchestrationNodeTypes = {
  sub_workflow: SubWorkflowNode,
  agent_call: AgentCallNode,
  parallel_map: ParallelMapNode,
} as const;
