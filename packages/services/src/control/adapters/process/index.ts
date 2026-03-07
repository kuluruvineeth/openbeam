import type { ServerAdapterModule } from "../types";
import { executeProcess } from "./execute";
import { testProcessEnvironment } from "./test";

export const processAdapter: ServerAdapterModule = {
  type: "PROCESS",
  execute: executeProcess,
  testEnvironment: testProcessEnvironment,
  models: [],
  agentConfigurationDoc: [
    "command (string, required): Shell command to execute",
    "args (string[] | string, optional): Command arguments",
    "cwd (string, optional): Working directory",
    "env (object, optional): Environment variable overrides",
    "timeoutSec (number, optional): Execution timeout in seconds (default: 300)",
  ].join("\n"),
};
