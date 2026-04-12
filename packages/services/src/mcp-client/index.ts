import type { Database } from "@openbeam/db";
import { decryptIfEncrypted } from "@openbeam/db";
import { mcpClientPool } from "@openbeam/mcp-server/client";
import { logger } from "../lib/logger";
import { deriveSlug } from "./sanitize";
import { externalToolRegistry } from "./tool-registry";

export {
  deriveSlug,
  sanitizeToolDescription,
  sanitizeToolName,
  sanitizeToolResult,
} from "./sanitize";
export { ExternalToolRegistry, externalToolRegistry } from "./tool-registry";

interface PluginServerRow {
  id: string;
  slug: string;
  name: string;
  url: string;
  authTokenEncrypted: string | null;
  authTokenIv: string | null;
}

function decryptAuthToken(server: PluginServerRow): string | undefined {
  if (!server.authTokenEncrypted) {
    return;
  }
  return (
    decryptIfEncrypted(server.authTokenEncrypted, server.authTokenIv) ??
    undefined
  );
}

export async function syncPluginTools(
  db: Database,
  teamId: string
): Promise<number> {
  const servers = await db.mcpPluginServer.findMany({
    where: { teamId, enabled: true, status: { not: "DISABLED" } },
  });

  let totalTools = 0;

  for (const server of servers) {
    try {
      const entry = await mcpClientPool.get(server.id, {
        url: server.url,
        authToken: decryptAuthToken(server),
        serverId: server.id,
        serverName: server.slug,
      });

      externalToolRegistry.register(server.id, server.slug, entry.tools);

      await db.mcpPluginServer.update({
        where: { id: server.id },
        data: {
          status: "HEALTHY",
          lastHealthAt: new Date(),
          lastHealthError: null,
          healthFailCount: 0,
          toolsCache: JSON.parse(JSON.stringify(entry.tools)),
          toolsCachedAt: new Date(),
        },
      });

      totalTools += entry.tools.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      logger.warn(
        { serverId: server.id, slug: server.slug, error: message },
        "MCP plugin sync failed"
      );

      await db.mcpPluginServer.update({
        where: { id: server.id },
        data: {
          status: "UNHEALTHY",
          lastHealthError: message,
          healthFailCount: { increment: 1 },
        },
      });
    }
  }

  return totalTools;
}

export async function installPlugin(
  db: Database,
  params: {
    teamId: string;
    userId: string;
    name: string;
    url: string;
    authType: "NONE" | "BEARER_TOKEN" | "OAUTH2";
    authToken?: string;
  }
): Promise<{ id: string; toolCount: number }> {
  const { encryptIfConfigured } = await import("@openbeam/db");
  const slug = deriveSlug(params.name);
  const { encrypted: authTokenEncrypted, iv: authTokenIv } =
    encryptIfConfigured(params.authToken ?? null);
  const authTokenPrefix = params.authToken?.slice(0, 8) ?? null;

  const server = await db.mcpPluginServer.create({
    data: {
      teamId: params.teamId,
      installedBy: params.userId,
      name: params.name,
      slug,
      url: params.url,
      authType: params.authType,
      authTokenEncrypted,
      authTokenIv,
      authTokenPrefix,
    },
  });

  const entry = await mcpClientPool.get(server.id, {
    url: params.url,
    authToken: params.authToken,
    serverId: server.id,
    serverName: slug,
  });

  externalToolRegistry.register(server.id, slug, entry.tools);

  await db.mcpPluginServer.update({
    where: { id: server.id },
    data: {
      status: "HEALTHY",
      lastHealthAt: new Date(),
      toolsCache: JSON.parse(JSON.stringify(entry.tools)),
      toolsCachedAt: new Date(),
    },
  });

  return { id: server.id, toolCount: entry.tools.length };
}

export async function uninstallPlugin(
  db: Database,
  pluginId: string
): Promise<void> {
  externalToolRegistry.unregister(pluginId);
  await mcpClientPool.disconnect(pluginId);
  await db.mcpPluginServer.delete({ where: { id: pluginId } });
}

export async function refreshPluginTools(
  db: Database,
  pluginId: string
): Promise<number> {
  const server = await db.mcpPluginServer.findUniqueOrThrow({
    where: { id: pluginId },
  });

  const healthy = await mcpClientPool.healthCheck(pluginId);
  if (!healthy) {
    await mcpClientPool.disconnect(pluginId);
    await mcpClientPool.get(pluginId, {
      url: server.url,
      authToken: decryptAuthToken(server),
      serverId: pluginId,
      serverName: server.slug,
    });
  }

  const tools = mcpClientPool.getTools(pluginId);
  externalToolRegistry.unregister(pluginId);
  externalToolRegistry.register(pluginId, server.slug, tools);

  await db.mcpPluginServer.update({
    where: { id: pluginId },
    data: {
      toolsCache: JSON.parse(JSON.stringify(tools)),
      toolsCachedAt: new Date(),
      status: "HEALTHY",
      lastHealthAt: new Date(),
      lastHealthError: null,
      healthFailCount: 0,
    },
  });

  return tools.length;
}

export async function checkPluginHealth(
  db: Database,
  pluginId: string
): Promise<boolean> {
  const healthy = await mcpClientPool.healthCheck(pluginId);

  if (healthy) {
    await db.mcpPluginServer.update({
      where: { id: pluginId },
      data: {
        status: "HEALTHY",
        lastHealthAt: new Date(),
        lastHealthError: null,
        healthFailCount: 0,
      },
    });
    return true;
  }

  const server = await db.mcpPluginServer.update({
    where: { id: pluginId },
    data: {
      status: "UNHEALTHY",
      lastHealthError: "Health check failed",
      healthFailCount: { increment: 1 },
    },
  });

  if (server.healthFailCount >= 3) {
    await db.mcpPluginServer.update({
      where: { id: pluginId },
      data: { status: "DISABLED", enabled: false },
    });
  }

  return false;
}
