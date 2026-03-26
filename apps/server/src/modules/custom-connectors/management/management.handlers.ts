import type { RouteHandler } from "@hono/zod-openapi";
import prisma, {
  createCustomConnectorApiKey,
  createCustomConnectorDefinition,
  deleteCustomConnectorDefinition,
  getCustomConnectorById,
  listCustomConnectorApiKeys,
  listCustomConnectors,
  revokeCustomConnectorApiKey,
  updateCustomConnectorDefinition,
} from "@openbeam/db";
import { generateCustomConnectorApiKey } from "@openbeam/services";
import { deleteDocumentsByConnector } from "@openbeam/vespa";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  createApiKeyRoute,
  createDefinitionRoute,
  deleteDefinitionRoute,
  getDefinitionRoute,
  listApiKeysRoute,
  listDefinitionsRoute,
  revokeApiKeyRoute,
  updateDefinitionRoute,
} from "./management.routes";

function serializeDefinition(def: {
  id: string;
  teamId: string;
  connectorId: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  fieldMappings: unknown;
  defaultDocumentType: string;
  defaultIsPublic: boolean;
  totalDocuments: number;
  totalPushes: number;
  lastPushAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: def.id,
    teamId: def.teamId,
    connectorId: def.connectorId,
    slug: def.slug,
    name: def.name,
    description: def.description,
    iconUrl: def.iconUrl,
    fieldMappings: def.fieldMappings,
    defaultDocumentType: def.defaultDocumentType,
    defaultIsPublic: def.defaultIsPublic,
    totalDocuments: def.totalDocuments,
    totalPushes: def.totalPushes,
    lastPushAt: def.lastPushAt?.toISOString() ?? null,
    createdAt: def.createdAt.toISOString(),
    updatedAt: def.updatedAt.toISOString(),
  };
}

export const createDefinitionHandler: RouteHandler<
  typeof createDefinitionRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Team ID required" } },
      401
    );
  }

  const body = c.req.valid("json");

  const connector = await prisma.connector.create({
    data: {
      teamId,
      userId: c.get("user")?.id ?? teamId,
      workspaceExternalId: teamId,
      name: body.name,
      description: body.description,
      type: "SOURCE",
      authType: "API_KEY",
      app: "CUSTOM",
      status: "ACTIVE",
    },
  });

  try {
    const definition = await createCustomConnectorDefinition(prisma, {
      teamId,
      connectorId: connector.id,
      slug: body.slug,
      name: body.name,
      description: body.description,
      iconUrl: body.iconUrl,
      fieldMappings: body.fieldMappings,
      defaultDocumentType: body.defaultDocumentType,
      defaultIsPublic: body.defaultIsPublic,
    });

    return c.json(serializeDefinition(definition), 201);
  } catch (error) {
    await prisma.connector.delete({ where: { id: connector.id } });

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return c.json(
        {
          error: {
            code: "CONFLICT",
            message: `Slug "${body.slug}" already exists for this team`,
          },
        },
        409
      );
    }
    throw error;
  }
};

export const listDefinitionsHandler: RouteHandler<
  typeof listDefinitionsRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Team ID required" } },
      401
    );
  }

  const definitions = await listCustomConnectors(prisma, teamId);
  return c.json(definitions.map(serializeDefinition), 200);
};

export const getDefinitionHandler: RouteHandler<
  typeof getDefinitionRoute,
  AuthEnv
> = async (c) => {
  const { definitionId } = c.req.valid("param");
  const teamId = getTeamId(c);

  const definition = await getCustomConnectorById(prisma, definitionId);

  if (!definition || definition.teamId !== teamId) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Definition not found" } },
      404
    );
  }

  return c.json(serializeDefinition(definition), 200);
};

export const updateDefinitionHandler: RouteHandler<
  typeof updateDefinitionRoute,
  AuthEnv
> = async (c) => {
  const { definitionId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const body = c.req.valid("json");

  const existing = await getCustomConnectorById(prisma, definitionId);

  if (!existing || existing.teamId !== teamId) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Definition not found" } },
      404
    );
  }

  const updated = await updateCustomConnectorDefinition(
    prisma,
    definitionId,
    body
  );
  return c.json(serializeDefinition(updated), 200);
};

export const deleteDefinitionHandler: RouteHandler<
  typeof deleteDefinitionRoute,
  AuthEnv
> = async (c) => {
  const { definitionId } = c.req.valid("param");
  const teamId = getTeamId(c);

  const existing = await getCustomConnectorById(prisma, definitionId);

  if (!existing || existing.teamId !== teamId) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Definition not found" } },
      404
    );
  }

  deleteDocumentsByConnector(existing.connectorId).catch(
    Function.prototype as () => void
  );

  await deleteCustomConnectorDefinition(prisma, definitionId);

  return c.json({ id: definitionId, deleted: true }, 200);
};

export const createApiKeyHandler: RouteHandler<
  typeof createApiKeyRoute,
  AuthEnv
> = async (c) => {
  const { definitionId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const body = c.req.valid("json");

  const definition = await getCustomConnectorById(prisma, definitionId);

  if (!definition || definition.teamId !== teamId) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Definition not found" } },
      404
    );
  }

  const { key, hash, prefix } = await generateCustomConnectorApiKey();

  const apiKey = await createCustomConnectorApiKey(prisma, {
    definitionId,
    name: body.name,
    keyHash: hash,
    prefix,
    scopes: body.scopes,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
  });

  return c.json(
    {
      id: apiKey.id,
      key,
      prefix: apiKey.prefix,
      name: apiKey.name,
      createdAt: apiKey.createdAt.toISOString(),
    },
    201
  );
};

export const listApiKeysHandler: RouteHandler<
  typeof listApiKeysRoute,
  AuthEnv
> = async (c) => {
  const { definitionId } = c.req.valid("param");
  const teamId = getTeamId(c);

  const definition = await getCustomConnectorById(prisma, definitionId);

  if (!definition || definition.teamId !== teamId) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Definition not found" } },
      404
    );
  }

  const keys = await listCustomConnectorApiKeys(prisma, definitionId);

  return c.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      revoked: k.revoked,
      createdAt: k.createdAt.toISOString(),
    })),
    200
  );
};

export const revokeApiKeyHandler: RouteHandler<
  typeof revokeApiKeyRoute,
  AuthEnv
> = async (c) => {
  const { definitionId, keyId } = c.req.valid("param");
  const teamId = getTeamId(c);

  const definition = await getCustomConnectorById(prisma, definitionId);

  if (!definition || definition.teamId !== teamId) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Definition not found" } },
      404
    );
  }

  const result = await revokeCustomConnectorApiKey(prisma, keyId, definitionId);

  if (result.count === 0) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "API key not found or already revoked",
        },
      },
      404
    );
  }

  return c.json({ id: keyId, revoked: true }, 200);
};
