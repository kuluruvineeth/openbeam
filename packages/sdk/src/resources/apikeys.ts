import type { HttpClient } from "../client";
import type { RequestOptions } from "../types";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

interface ApiKeyCreated {
  id: string;
  key: string;
  name: string;
  prefix: string;
  scopes: string[];
}

interface ApiKeyRevoked {
  id: string;
  revoked: boolean;
}

export class ApiKeysResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async list(options?: RequestOptions): Promise<ApiKey[]> {
    const result = await this.client.callTool<{ keys: ApiKey[] }>(
      "apikey_list",
      {},
      options
    );
    return result.keys ?? [];
  }

  async create(
    name: string,
    scopes?: string[],
    options?: RequestOptions
  ): Promise<ApiKeyCreated> {
    return await this.client.callTool<ApiKeyCreated>(
      "apikey_create",
      { name, ...(scopes ? { scopes } : {}) },
      options
    );
  }

  async revoke(
    apiKeyId: string,
    options?: RequestOptions
  ): Promise<ApiKeyRevoked> {
    return await this.client.callTool<ApiKeyRevoked>(
      "apikey_revoke",
      { apiKeyId },
      options
    );
  }
}
