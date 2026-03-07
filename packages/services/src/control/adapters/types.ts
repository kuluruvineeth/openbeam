import type {
  AdapterEnvironmentTestResult,
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@openbeam/types/control/adapters";

export interface AdapterLogEvent {
  stream: "stdout" | "stderr";
  chunk: string;
  ts?: Date;
}

export interface AdapterInvocationMeta {
  provider?: string;
  model?: string;
  sessionId?: string;
}

export interface AdapterExecutionOptions {
  runId: string;
  context: AdapterExecutionContext;
  config: Record<string, unknown>;
  env: Record<string, string>;
  onLog: (event: AdapterLogEvent) => Promise<void>;
  onMeta?: (meta: AdapterInvocationMeta) => Promise<void>;
  authToken?: string;
}

export interface AdapterEnvironmentTestContext {
  config: Record<string, unknown>;
  env: Record<string, string>;
}

export interface AdapterSessionCodec {
  serialize: (
    params: Record<string, unknown>
  ) => Record<string, unknown> | null;
  deserialize: (raw: Record<string, unknown>) => Record<string, unknown> | null;
  getDisplayId?: (params: Record<string, unknown>) => string | null;
}

export interface AdapterModel {
  id: string;
  name: string;
  provider?: string;
}

export interface ServerAdapterModule {
  type: string;
  execute: (opts: AdapterExecutionOptions) => Promise<AdapterExecutionResult>;
  testEnvironment?: (
    ctx: AdapterEnvironmentTestContext
  ) => Promise<AdapterEnvironmentTestResult>;
  sessionCodec?: AdapterSessionCodec;
  models?: AdapterModel[];
  listModels?: () => Promise<AdapterModel[]>;
  agentConfigurationDoc?: string;
}
