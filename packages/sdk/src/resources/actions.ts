import type { HttpClient } from "../client";
import type {
  ActionExecuteResponse,
  ActionsListOptions,
  ActionsListResponse,
  RequestOptions,
} from "../types";

export class ActionsResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async list(options?: ActionsListOptions): Promise<ActionsListResponse> {
    return await this.client.callTool<ActionsListResponse>(
      "connector_actions_list",
      {
        connectorType: options?.connectorType,
        category: options?.category,
      },
      options
    );
  }

  async execute(
    connectorId: string,
    actionId: string,
    params: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<ActionExecuteResponse> {
    return await this.client.callTool<ActionExecuteResponse>(
      "connector_action_execute",
      { connectorId, actionId, params },
      options
    );
  }
}
