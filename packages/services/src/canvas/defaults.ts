import { agentCallExecutor } from "./executors/agent-call";
import { audioExecutor } from "./executors/audio";
import { chunkExecutor } from "./executors/chunk";
import { classifyExecutor } from "./executors/classify";
import { codeExecutor } from "./executors/code";
import { conditionExecutor } from "./executors/condition";
import { connectorExecutor } from "./executors/connector";
import { connectorActionExecutor } from "./executors/connector-action";
import { databaseQueryExecutor } from "./executors/database-query";
import { embeddingsExecutor } from "./executors/embeddings";
import { endExecutor } from "./executors/end";
import { extractExecutor } from "./executors/extract";
import { filterExecutor } from "./executors/filter";
import { graphqlQueryExecutor } from "./executors/graphql-query";
import { httpRequestExecutor } from "./executors/http-request";
import { imageExecutor } from "./executors/image";
import { llmExecutor } from "./executors/llm";
import { memoryReadExecutor } from "./executors/memory-read";
import { memorySearchExecutor } from "./executors/memory-search";
import { memoryWriteExecutor } from "./executors/memory-write";
import { mergeExecutor } from "./executors/merge";
import { notifyExecutor } from "./executors/notify";
import { ragExecutor } from "./executors/rag";
import { rerankExecutor } from "./executors/rerank";
import { startExecutor } from "./executors/start";
import { summarizeExecutor } from "./executors/summarize";
import { templateExecutor } from "./executors/template";
import { toolExecutor } from "./executors/tool";
import { transformExecutor } from "./executors/transform";
import {
  triggerEventExecutor,
  triggerManualExecutor,
  triggerScheduleExecutor,
  triggerWebhookExecutor,
} from "./executors/trigger";
import { videoExecutor } from "./executors/video";
import {
  freezeRegistry,
  getCanvasNodeExecutor,
  registerCanvasNodeExecutor,
} from "./registry";

let defaultsRegistered = false;

export function registerDefaultCanvasNodeExecutors(): void {
  if (defaultsRegistered) {
    return;
  }

  if (!getCanvasNodeExecutor("start")) {
    registerCanvasNodeExecutor("start", startExecutor);
  }

  if (!getCanvasNodeExecutor("agent_call")) {
    registerCanvasNodeExecutor("agent_call", agentCallExecutor);
  }

  if (!getCanvasNodeExecutor("audio")) {
    registerCanvasNodeExecutor("audio", audioExecutor);
  }

  if (!getCanvasNodeExecutor("code")) {
    registerCanvasNodeExecutor("code", codeExecutor);
  }

  if (!getCanvasNodeExecutor("connector_action")) {
    registerCanvasNodeExecutor("connector_action", connectorActionExecutor);
  }

  if (!getCanvasNodeExecutor("connector")) {
    registerCanvasNodeExecutor("connector", connectorExecutor);
  }

  if (!getCanvasNodeExecutor("condition")) {
    registerCanvasNodeExecutor("condition", conditionExecutor);
  }

  if (!getCanvasNodeExecutor("end")) {
    registerCanvasNodeExecutor("end", endExecutor);
  }

  if (!getCanvasNodeExecutor("transform")) {
    registerCanvasNodeExecutor("transform", transformExecutor);
  }

  if (!getCanvasNodeExecutor("filter")) {
    registerCanvasNodeExecutor("filter", filterExecutor);
  }

  if (!getCanvasNodeExecutor("http_request")) {
    registerCanvasNodeExecutor("http_request", httpRequestExecutor);
  }

  if (!getCanvasNodeExecutor("database_query")) {
    registerCanvasNodeExecutor("database_query", databaseQueryExecutor);
  }

  if (!getCanvasNodeExecutor("graphql_query")) {
    registerCanvasNodeExecutor("graphql_query", graphqlQueryExecutor);
  }

  if (!getCanvasNodeExecutor("tool")) {
    registerCanvasNodeExecutor("tool", toolExecutor);
  }

  if (!getCanvasNodeExecutor("memory_write")) {
    registerCanvasNodeExecutor("memory_write", memoryWriteExecutor);
  }

  if (!getCanvasNodeExecutor("memory_read")) {
    registerCanvasNodeExecutor("memory_read", memoryReadExecutor);
  }

  if (!getCanvasNodeExecutor("memory_search")) {
    registerCanvasNodeExecutor("memory_search", memorySearchExecutor);
  }

  if (!getCanvasNodeExecutor("chunk")) {
    registerCanvasNodeExecutor("chunk", chunkExecutor);
  }

  if (!getCanvasNodeExecutor("template")) {
    registerCanvasNodeExecutor("template", templateExecutor);
  }

  if (!getCanvasNodeExecutor("notify")) {
    registerCanvasNodeExecutor("notify", notifyExecutor);
  }

  if (!getCanvasNodeExecutor("llm")) {
    registerCanvasNodeExecutor("llm", llmExecutor);
  }

  if (!getCanvasNodeExecutor("merge")) {
    registerCanvasNodeExecutor("merge", mergeExecutor);
  }

  if (!getCanvasNodeExecutor("rag")) {
    registerCanvasNodeExecutor("rag", ragExecutor);
  }

  if (!getCanvasNodeExecutor("rerank")) {
    registerCanvasNodeExecutor("rerank", rerankExecutor);
  }

  if (!getCanvasNodeExecutor("summarize")) {
    registerCanvasNodeExecutor("summarize", summarizeExecutor);
  }

  if (!getCanvasNodeExecutor("embeddings")) {
    registerCanvasNodeExecutor("embeddings", embeddingsExecutor);
  }

  if (!getCanvasNodeExecutor("extract")) {
    registerCanvasNodeExecutor("extract", extractExecutor);
  }

  if (!getCanvasNodeExecutor("classify")) {
    registerCanvasNodeExecutor("classify", classifyExecutor);
  }

  if (!getCanvasNodeExecutor("image")) {
    registerCanvasNodeExecutor("image", imageExecutor);
  }

  if (!getCanvasNodeExecutor("video")) {
    registerCanvasNodeExecutor("video", videoExecutor);
  }

  if (!getCanvasNodeExecutor("trigger_manual")) {
    registerCanvasNodeExecutor("trigger_manual", triggerManualExecutor);
  }

  if (!getCanvasNodeExecutor("trigger_schedule")) {
    registerCanvasNodeExecutor("trigger_schedule", triggerScheduleExecutor);
  }

  if (!getCanvasNodeExecutor("trigger_webhook")) {
    registerCanvasNodeExecutor("trigger_webhook", triggerWebhookExecutor);
  }

  if (!getCanvasNodeExecutor("trigger_event")) {
    registerCanvasNodeExecutor("trigger_event", triggerEventExecutor);
  }

  defaultsRegistered = true;
  freezeRegistry();
}
