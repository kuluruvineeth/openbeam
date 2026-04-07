export interface ActionCredentials {
  accessToken: string;
  refreshToken?: string;
  config: Record<string, unknown>;
}

export interface ActionExecutionResult<TData = Record<string, unknown>> {
  success: boolean;
  data: TData;
  error?: string;
}

export interface ConnectorHandler {
  readonly connectorType: string;
  readonly supportedActions: readonly string[];
  execute(
    actionId: string,
    params: Record<string, unknown>,
    credentials: ActionCredentials,
    connectorId: string
  ): Promise<ActionExecutionResult>;
}

export interface DispatchRequest {
  connectorId: string;
  connectorType?: string;
  actionId: string;
  params: Record<string, unknown>;
  teamId: string;
  userId: string;
  source: "mcp" | "canvas" | "api" | "agent" | "bot" | "worker";
}
