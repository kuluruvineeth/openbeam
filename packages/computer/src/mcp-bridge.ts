import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpPair {
  client: Client;
  server: McpServer;
  close: () => Promise<void>;
}

export async function connectMcpPair(server: McpServer): Promise<McpPair> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "openbeam-computer", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    server,
    async close() {
      await server.close().catch(Function.prototype as () => void);
    },
  };
}
