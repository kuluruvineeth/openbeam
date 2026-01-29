import type { CanvasNodeType } from "@openplane/types/canvas";

import {
  createAudioNodeData,
  createClassifyNodeData,
  createExtractNodeData,
  createImageNodeData,
  createLlmNodeData,
  createRagNodeData,
  createSummarizeNodeData,
  createVideoNodeData,
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
  createConnectorActionNodeData,
  createConnectorNodeData,
  createDatabaseQueryNodeData,
  createGraphqlQueryNodeData,
  createHttpRequestNodeData,
  createToolNodeData,
} from "./integration";
import {
  createMemoryReadNodeData,
  createMemorySearchNodeData,
  createMemoryWriteNodeData,
} from "./memory";
import {
  createAgentCallNodeData,
  createParallelMapNodeData,
  createSubWorkflowNodeData,
} from "./orchestration";
import {
  createCodeNodeData,
  createFilterNodeData,
  createTemplateNodeData,
} from "./transform";
import {
  createEventTriggerNodeData,
  createManualTriggerNodeData,
  createScheduleTriggerNodeData,
  createWebhookTriggerNodeData,
} from "./trigger";

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
  image: createImageNodeData,
  audio: createAudioNodeData,
  video: createVideoNodeData,

  template: createTemplateNodeData,
  code: createCodeNodeData,
  filter: createFilterNodeData,

  approval: createApprovalNodeData,
  input: createInputNodeData,
  notify: createNotifyNodeData,
  annotation: createAnnotationNodeData,

  connector: createConnectorNodeData,
  connector_action: createConnectorActionNodeData,
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

const ID_COUNTER_LIMIT = 1_000_000;
let lastIdTimestamp = 0;
let idCounter = 0;

export function createUniqueNodeId(prefix: string) {
  const timestamp = Date.now();
  if (timestamp !== lastIdTimestamp) {
    lastIdTimestamp = timestamp;
    idCounter = 0;
  } else {
    idCounter = (idCounter + 1) % ID_COUNTER_LIMIT;
  }
  return `${prefix}-${timestamp}-${idCounter}`;
}

export {
  createAgentCallNodeData,
  createAnnotationNodeData,
  createApprovalNodeData,
  createAudioNodeData,
  createClassifyNodeData,
  createCodeNodeData,
  createConditionNodeData,
  createConnectorActionNodeData,
  createConnectorNodeData,
  createDatabaseQueryNodeData,
  createEndNodeData,
  createEventTriggerNodeData,
  createExtractNodeData,
  createFilterNodeData,
  createGraphqlQueryNodeData,
  createHttpRequestNodeData,
  createImageNodeData,
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
  createVideoNodeData,
  createWebhookTriggerNodeData,
};
