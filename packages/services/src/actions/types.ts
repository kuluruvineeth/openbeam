export interface ActionExecutionContext {
  teamId: string;
  userId: string;
  connectorId: string;
  connectorType: string;
  source: "mcp" | "canvas" | "api" | "agent";
  traceId: string;
}

export interface ActionExecutionRequest {
  actionId: string;
  params: Record<string, unknown>;
  context: ActionExecutionContext;
}

export interface ActionExecutionResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
}

export interface ActionExecutor {
  readonly connectorType: string;
  readonly supportedActions: ReadonlySet<string>;
  execute(
    request: ActionExecutionRequest,
    accessToken: string
  ): Promise<ActionExecutionResult>;
}

export type ActionExecutorFactory = () => ActionExecutor;
