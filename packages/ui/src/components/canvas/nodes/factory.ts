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
import { createConnectorNodeData } from "./integration/connector-node";
import { createDatabaseQueryNodeData } from "./integration/database-query-node";
import { createGraphqlQueryNodeData } from "./integration/graphql-query-node";
import { createHttpRequestNodeData } from "./integration/http-request-node";
import { createToolNodeData } from "./integration/tool-node";
import { createMemoryReadNodeData } from "./memory/memory-read-node";
import { createMemorySearchNodeData } from "./memory/memory-search-node";
import { createMemoryWriteNodeData } from "./memory/memory-write-node";
import { createAgentCallNodeData } from "./orchestration/agent-call-node";
import { createParallelMapNodeData } from "./orchestration/parallel-map-node";
import { createSubWorkflowNodeData } from "./orchestration/sub-workflow-node";
import {
  createCodeNodeData,
  createFilterNodeData,
  createTemplateNodeData,
} from "./transform";
import { createEventTriggerNodeData } from "./trigger/event-trigger-node";
import { createManualTriggerNodeData } from "./trigger/manual-trigger-node";
import { createScheduleTriggerNodeData } from "./trigger/schedule-trigger-node";
import { createWebhookTriggerNodeData } from "./trigger/webhook-trigger-node";

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

  connector: createConnectorNodeData,
  http_request: createHttpRequestNodeData,
  database_query: createDatabaseQueryNodeData,
  graphql_query: createGraphqlQueryNodeData,
  tool: createToolNodeData,

  trigger_manual: createManualTriggerNodeData,
  trigger_schedule: createScheduleTriggerNodeData,
  trigger_webhook: createWebhookTriggerNodeData,
  trigger_event: createEventTriggerNodeData,

  memory_read: createMemoryReadNodeData,
  memory_write: createMemoryWriteNodeData,
  memory_search: createMemorySearchNodeData,

  sub_workflow: createSubWorkflowNodeData,
  agent_call: createAgentCallNodeData,
  parallel_map: createParallelMapNodeData,
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
  createAgentCallNodeData,
  createAnnotationNodeData,
  createApprovalNodeData,
  createClassifyNodeData,
  createCodeNodeData,
  createConditionNodeData,
  createConnectorNodeData,
  createDatabaseQueryNodeData,
  createEndNodeData,
  createEventTriggerNodeData,
  createExtractNodeData,
  createFilterNodeData,
  createGraphqlQueryNodeData,
  createHttpRequestNodeData,
  createInputNodeData,
  createLlmNodeData,
  createLoopNodeData,
  createManualTriggerNodeData,
  createMemoryReadNodeData,
  createMemorySearchNodeData,
  createMemoryWriteNodeData,
  createNotifyNodeData,
  createParallelJoinNodeData,
  createParallelMapNodeData,
  createParallelSplitNodeData,
  createRagNodeData,
  createScheduleTriggerNodeData,
  createStartNodeData,
  createSubWorkflowNodeData,
  createSummarizeNodeData,
  createTemplateNodeData,
  createToolNodeData,
  createWebhookTriggerNodeData,
};
