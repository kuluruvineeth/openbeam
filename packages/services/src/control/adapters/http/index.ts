import type { ServerAdapterModule } from "../types";
import { executeHttp } from "./execute";
import { testHttpEnvironment } from "./test";

export const httpAdapter: ServerAdapterModule = {
  type: "HTTP",
  execute: executeHttp,
  testEnvironment: testHttpEnvironment,
  models: [],
  agentConfigurationDoc: [
    "url (string, required): Webhook endpoint URL",
    "method (string, optional): HTTP method (default: POST)",
    "headers (object, optional): Custom headers",
    "payloadTemplate (object, optional): JSON payload template",
    "timeoutSec (number, optional): Request timeout in seconds (default: 30)",
  ].join("\n"),
};
