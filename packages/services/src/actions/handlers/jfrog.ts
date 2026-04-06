import {
  copyArtifact,
  deleteArtifact,
  setArtifactProperties,
} from "../../jfrog/actions";
import { createJFrogClient, type JFrogClient } from "../../jfrog/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: JFrogClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async artifact_copy(client, p) {
    const r = await copyArtifact(client, {
      srcRepo: str(p, "srcRepo"),
      srcPath: str(p, "srcPath"),
      destRepo: str(p, "destRepo"),
      destPath: str(p, "destPath"),
      dryRun: typeof p.dryRun === "boolean" ? p.dryRun : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async artifact_delete(client, p) {
    const r = await deleteArtifact(client, {
      repo: str(p, "repo"),
      path: str(p, "path"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async artifact_set_properties(client, p) {
    const properties = (
      typeof p.properties === "object" && p.properties !== null
        ? p.properties
        : {}
    ) as Record<string, string>;
    const r = await setArtifactProperties(client, {
      repo: str(p, "repo"),
      path: str(p, "path"),
      properties,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "jfrog",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported JFrog action: ${actionId}`,
      };
    }

    const client = createJFrogClient({
      connectorId,
      accessToken: credentials.accessToken,
      instanceUrl: (credentials.config.instanceUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
