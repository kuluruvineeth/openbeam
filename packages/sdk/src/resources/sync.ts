import type { HttpClient } from "../client";
import type {
  RequestOptions,
  SyncControlResponse,
  SyncErrorsResponse,
  SyncHealthResponse,
  SyncHistoryOptions,
  SyncHistoryResponse,
  SyncProgressResponse,
  SyncStatusResponse,
  SyncTriggerAllResponse,
  SyncTriggerResponse,
} from "../types";

export class SyncResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async trigger(
    connectorId: string,
    type: "full" | "incremental" = "incremental",
    options?: RequestOptions
  ): Promise<SyncTriggerResponse> {
    return await this.client.callTool<SyncTriggerResponse>(
      "sync_trigger",
      { connectorId, type },
      options
    );
  }

  async triggerAll(
    options?: RequestOptions & {
      type?: "full" | "incremental";
      connectorTypes?: string[];
    }
  ): Promise<SyncTriggerAllResponse> {
    return await this.client.callTool<SyncTriggerAllResponse>(
      "sync_trigger_all",
      {
        type: options?.type,
        connectorTypes: options?.connectorTypes,
      },
      options
    );
  }

  async status(
    connectorId: string,
    options?: RequestOptions
  ): Promise<SyncStatusResponse> {
    return await this.client.callTool<SyncStatusResponse>(
      "sync_status",
      { connectorId },
      options
    );
  }

  async history(
    connectorId: string,
    options?: SyncHistoryOptions
  ): Promise<SyncHistoryResponse> {
    return await this.client.callTool<SyncHistoryResponse>(
      "sync_history",
      {
        connectorId,
        limit: options?.limit,
        offset: options?.offset,
      },
      options
    );
  }

  async progress(
    connectorId: string,
    options?: RequestOptions
  ): Promise<SyncProgressResponse> {
    return await this.client.callTool<SyncProgressResponse>(
      "sync_progress",
      { connectorId },
      options
    );
  }

  async health(options?: RequestOptions): Promise<SyncHealthResponse> {
    return await this.client.callTool<SyncHealthResponse>(
      "sync_health",
      {},
      options
    );
  }

  async errors(
    options?: RequestOptions & { connectorId?: string; limit?: number }
  ): Promise<SyncErrorsResponse> {
    return await this.client.callTool<SyncErrorsResponse>(
      "sync_errors",
      {
        connectorId: options?.connectorId,
        limit: options?.limit,
      },
      options
    );
  }

  async cancel(
    connectorId: string,
    options?: RequestOptions
  ): Promise<SyncControlResponse> {
    return await this.client.callTool<SyncControlResponse>(
      "sync_cancel",
      { connectorId },
      options
    );
  }

  async pause(
    connectorId: string,
    options?: RequestOptions
  ): Promise<SyncControlResponse> {
    return await this.client.callTool<SyncControlResponse>(
      "sync_pause",
      { connectorId },
      options
    );
  }

  async resume(
    connectorId: string,
    options?: RequestOptions
  ): Promise<SyncControlResponse> {
    return await this.client.callTool<SyncControlResponse>(
      "sync_resume",
      { connectorId },
      options
    );
  }
}
