import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface PoolEntry {
  client: Client;
  transport: StreamableHTTPClientTransport;
  tools: ToolDefinition[];
  connectedAt: number;
  lastHealthAt: number;
}

interface ConnectConfig {
  url: string;
  authToken?: string;
  serverId: string;
  serverName: string;
}

const HEALTH_CHECK_TIMEOUT = 10_000;

export class McpClientPool {
  private readonly pool = new Map<string, PoolEntry>();
  private readonly connecting = new Map<string, Promise<PoolEntry>>();

  async get(serverId: string, config: ConnectConfig): Promise<PoolEntry> {
    const existing = this.pool.get(serverId);
    if (existing) {
      return existing;
    }

    const inflight = this.connecting.get(serverId);
    if (inflight) {
      return inflight;
    }

    const promise = this.connect(config);
    this.connecting.set(serverId, promise);
    try {
      const entry = await promise;
      return entry;
    } finally {
      this.connecting.delete(serverId);
    }
  }

  async healthCheck(serverId: string): Promise<boolean> {
    const entry = this.pool.get(serverId);
    if (!entry) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
      try {
        const result = await entry.client.listTools();
        entry.tools = result.tools as ToolDefinition[];
        entry.lastHealthAt = Date.now();
        return true;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const entry = this.pool.get(serverId);
    if (!entry) {
      return;
    }

    try {
      await entry.client.close();
    } catch {
      // best effort
    }
    this.pool.delete(serverId);
  }

  async disconnectAll(): Promise<void> {
    const serverIds = [...this.pool.keys()];
    await Promise.all(serverIds.map((id) => this.disconnect(id)));
  }

  getTools(serverId: string): ToolDefinition[] {
    return this.pool.get(serverId)?.tools ?? [];
  }

  allTools(): Map<string, ToolDefinition[]> {
    const result = new Map<string, ToolDefinition[]>();
    for (const [serverId, entry] of this.pool) {
      result.set(serverId, entry.tools);
    }
    return result;
  }

  getClient(serverId: string): Client | undefined {
    return this.pool.get(serverId)?.client;
  }

  has(serverId: string): boolean {
    return this.pool.has(serverId);
  }

  get size(): number {
    return this.pool.size;
  }

  private async connect(config: ConnectConfig): Promise<PoolEntry> {
    const headers: Record<string, string> = {};
    if (config.authToken) {
      headers.Authorization = `Bearer ${config.authToken}`;
    }

    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: { headers },
    });

    const client = new Client({
      name: `openbeam-bot-plugin-${config.serverName}`,
      version: "1.0.0",
    });

    transport.onclose = () => {
      this.pool.delete(config.serverId);
    };

    await client.connect(transport);

    const result = await client.listTools();
    const tools = result.tools as ToolDefinition[];

    const entry: PoolEntry = {
      client,
      transport,
      tools,
      connectedAt: Date.now(),
      lastHealthAt: Date.now(),
    };

    this.pool.set(config.serverId, entry);
    return entry;
  }
}

export const mcpClientPool = new McpClientPool();
