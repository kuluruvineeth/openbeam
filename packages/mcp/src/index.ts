#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createProductionMcpServer } from "./server";

export type { AuditSink, McpAuditEntry } from "./middleware/audit";
export {
  auditToolCall,
  clearAuditBuffer,
  flushAudit,
  getAuditBuffer,
  setAuditSink,
  stopAuditFlush,
} from "./middleware/audit";
export type { McpAuthContext } from "./middleware/auth";
export { isToolAllowedForContext, resolveAuthContext } from "./middleware/auth";
export type { RateLimitResult } from "./middleware/rate-limit";
export { checkMcpRateLimit } from "./middleware/rate-limit";
export type { ProductionMcpServerOptions } from "./server";
export { createProductionMcpServer } from "./server";

async function main() {
  const { server } = createProductionMcpServer({
    transport: "stdio",
    enableRateLimit: true,
    enableAudit: true,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(
    `MCP server error: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
