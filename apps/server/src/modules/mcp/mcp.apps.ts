import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const VIEWS: Record<string, string> = {
  "ui://openbeam/search": "search.html",
  "ui://openbeam/connector-dashboard": "connector-dashboard.html",
  "ui://openbeam/document-preview": "document-preview.html",
  "ui://openbeam/people": "people.html",
  "ui://openbeam/sync-status": "sync-status.html",
  "ui://openbeam/team": "team.html",
};

function resolveDist(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("@openbeam/mcp-apps/package.json");
    const dist = join(dirname(pkgPath), "dist", "views");
    return existsSync(dist) ? dist : null;
  } catch {
    return null;
  }
}

export function registerOpenBeamApps(server: McpServer): void {
  const dist = resolveDist();
  if (!dist) {
    console.log("[mcp-apps] dist not found, skipping app registration");
    return;
  }

  let registered = 0;
  for (const [uri, file] of Object.entries(VIEWS)) {
    const filePath = join(dist, file);
    if (!existsSync(filePath)) {
      console.log(`[mcp-apps] file not found: ${filePath}`);
      continue;
    }

    const html = readFileSync(filePath, "utf-8");

    registerAppResource(
      server,
      uri,
      uri,
      { mimeType: RESOURCE_MIME_TYPE },
      async () => ({
        contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: html }],
      })
    );
    registered += 1;
  }
  console.log(`[mcp-apps] registered ${registered} app resources from ${dist}`);
}
