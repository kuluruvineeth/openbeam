"use client";

import { useState } from "react";
import { MCP_CLIENTS, MCP_SERVER_URL } from "../lib/mcp-configs";
import { CopyInput } from "./copy-input";
import { McpConfigCard } from "./mcp-config-card";

export function McpSetupSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-medium text-sm">MCP Server</h3>
        <p className="text-muted-foreground text-xs">
          Connect AI assistants to OpenBeam via the Model Context Protocol.
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="font-medium text-muted-foreground text-xs">
          Server URL
        </span>
        <CopyInput value={MCP_SERVER_URL} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MCP_CLIENTS.map((client) => (
          <McpConfigCard
            client={client}
            isExpanded={expandedId === client.id}
            key={client.id}
            onToggle={() =>
              setExpandedId((prev) => (prev === client.id ? null : client.id))
            }
          />
        ))}
      </div>
    </section>
  );
}
