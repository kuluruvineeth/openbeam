import type { HttpClient } from "../client";
import type {
  ConnectorAvailableOptions,
  ConnectorAvailableResponse,
  ConnectorDetail,
  ConnectorHealth,
  ConnectorListOptions,
  ConnectorListResponse,
  RequestOptions,
} from "../types";

export class ConnectorsResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async list(options?: ConnectorListOptions): Promise<ConnectorListResponse> {
    return await this.client.callTool<ConnectorListResponse>(
      "connector_list",
      {
        status: options?.status,
        type: options?.type,
        cursor: options?.cursor,
        pageSize: options?.pageSize,
      },
      options
    );
  }

  async get(
    id: string,
    options?: RequestOptions
  ): Promise<{ data: ConnectorDetail }> {
    return await this.client.callTool<{ data: ConnectorDetail }>(
      "connector_get",
      { id },
      options
    );
  }

  async health(
    id: string,
    options?: RequestOptions
  ): Promise<{ data: ConnectorHealth }> {
    return await this.client.callTool<{ data: ConnectorHealth }>(
      "connector_health",
      { id },
      options
    );
  }

  async available(
    options?: ConnectorAvailableOptions
  ): Promise<ConnectorAvailableResponse> {
    return await this.client.callTool<ConnectorAvailableResponse>(
      "connector_available",
      {
        authType: options?.authType,
        category: options?.category,
      },
      options
    );
  }

  async disconnect(
    connectorId: string,
    options?: RequestOptions
  ): Promise<{ connectorId: string; name: string; status: string }> {
    return await this.client.callTool<{
      connectorId: string;
      name: string;
      status: string;
    }>("connector_disconnect", { connectorId }, options);
  }
}
