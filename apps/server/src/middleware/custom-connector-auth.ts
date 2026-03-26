import prisma, {
  getCustomConnectorApiKeyByPrefix,
  touchCustomConnectorApiKey,
} from "@openbeam/db";
import {
  extractCustomConnectorKeyPrefix,
  isCustomConnectorKey,
  verifyCustomConnectorApiKey,
} from "@openbeam/services";
import { createMiddleware } from "hono/factory";

export interface CustomConnectorAuthContext {
  definitionId: string;
  connectorId: string;
  teamId: string;
  workspaceId: string;
  slug: string;
  scopes: string[];
  defaultDocumentType: string;
  defaultIsPublic: boolean;
  fieldMappings: Record<string, string>;
}

export type CustomConnectorAuthEnv = {
  Variables: {
    customConnector: CustomConnectorAuthContext;
  };
};

export const customConnectorAuth = createMiddleware<CustomConnectorAuthEnv>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authorization header required",
          },
        },
        401
      );
    }

    const key = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!isCustomConnectorKey(key)) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid API key format" } },
        401
      );
    }

    const prefix = extractCustomConnectorKeyPrefix(key);

    if (!prefix) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Malformed API key" } },
        401
      );
    }

    const candidates = await getCustomConnectorApiKeyByPrefix(prisma, prefix);

    if (candidates.length === 0) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "API key not found" } },
        401
      );
    }

    let matched: (typeof candidates)[0] | undefined;

    for (const candidate of candidates) {
      const valid = await verifyCustomConnectorApiKey(key, candidate.keyHash);
      if (valid) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
        401
      );
    }

    if (matched.expiresAt && matched.expiresAt < new Date()) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "API key expired" } },
        401
      );
    }

    const definition = matched.definition;
    const connector = definition.connector;

    touchCustomConnectorApiKey(prisma, matched.id).catch(
      Function.prototype as () => void
    );

    const fieldMappings =
      definition.fieldMappings &&
      typeof definition.fieldMappings === "object" &&
      !Array.isArray(definition.fieldMappings)
        ? (definition.fieldMappings as Record<string, string>)
        : {};

    c.set("customConnector", {
      definitionId: definition.id,
      connectorId: connector.id,
      teamId: definition.teamId,
      workspaceId: connector.workspaceExternalId,
      slug: definition.slug,
      scopes: matched.scopes,
      defaultDocumentType: definition.defaultDocumentType,
      defaultIsPublic: definition.defaultIsPublic,
      fieldMappings,
    });

    await next();
  }
);

export function requireCustomConnectorScope(scope: string) {
  return createMiddleware<CustomConnectorAuthEnv>(async (c, next) => {
    const ctx = c.get("customConnector");

    if (!ctx.scopes.includes(scope)) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: `Required scope: ${scope}`,
          },
        },
        403
      );
    }

    await next();
  });
}
