import type { RouteHandler } from "@hono/zod-openapi";
import prisma, {
  decrementCustomConnectorDocuments,
  getCustomConnectorBySlug,
  incrementCustomConnectorStats,
} from "@openbeam/db";
import type { FieldMapperContext } from "@openbeam/services";
import { pushBatch, pushSingleDocument } from "@openbeam/services";
import { deleteDocumentById } from "@openbeam/vespa";
import type { CustomConnectorAuthEnv } from "@/middleware/custom-connector-auth";
import logger from "@/utils/logger";
import type {
  batchDeleteRoute,
  batchPushRoute,
  deleteDocumentRoute,
  pushDocumentRoute,
  statusRoute,
} from "./push.routes";

type PushEnv = CustomConnectorAuthEnv;

function buildFieldMapperContext(
  ctx: CustomConnectorAuthEnv["Variables"]["customConnector"]
): FieldMapperContext {
  return {
    connectorId: ctx.connectorId,
    teamId: ctx.teamId,
    workspaceId: ctx.workspaceId,
    defaultDocumentType: ctx.defaultDocumentType,
    defaultIsPublic: ctx.defaultIsPublic,
    fieldMappings: ctx.fieldMappings,
  };
}

export const pushDocumentHandler: RouteHandler<
  typeof pushDocumentRoute,
  PushEnv
> = async (c) => {
  const connectorCtx = c.get("customConnector");
  const body = c.req.valid("json");
  const mapperCtx = buildFieldMapperContext(connectorCtx);

  try {
    const result = await pushSingleDocument(body, mapperCtx);

    if (!result.success) {
      return c.json(
        {
          error: { code: "FEED_ERROR", message: result.error ?? "Feed failed" },
        },
        500
      );
    }

    incrementCustomConnectorStats(prisma, connectorCtx.definitionId, 1).catch(
      Function.prototype as () => void
    );

    return c.json({ success: true, documentId: result.documentId }, 200);
  } catch (error) {
    logger.error(
      { error, connectorId: connectorCtx.connectorId },
      "Push document error"
    );
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      500
    );
  }
};

export const batchPushHandler: RouteHandler<
  typeof batchPushRoute,
  PushEnv
> = async (c) => {
  const connectorCtx = c.get("customConnector");
  const { documents } = c.req.valid("json");
  const mapperCtx = buildFieldMapperContext(connectorCtx);

  try {
    const result = await pushBatch(documents, mapperCtx);

    if (result.succeeded > 0) {
      incrementCustomConnectorStats(
        prisma,
        connectorCtx.definitionId,
        result.succeeded
      ).catch(Function.prototype as () => void);
    }

    return c.json(result, 200);
  } catch (error) {
    logger.error(
      { error, connectorId: connectorCtx.connectorId },
      "Batch push error"
    );
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      500
    );
  }
};

export const deleteDocumentHandler: RouteHandler<
  typeof deleteDocumentRoute,
  PushEnv
> = async (c) => {
  const connectorCtx = c.get("customConnector");
  const { documentId } = c.req.valid("param");
  const vespaId = `${connectorCtx.connectorId}_custom_${documentId}`;

  try {
    const result = await deleteDocumentById(vespaId);

    if (!result.success) {
      return c.json(
        {
          error: {
            code: "DELETE_ERROR",
            message: result.error ?? "Delete failed",
          },
        },
        500
      );
    }

    decrementCustomConnectorDocuments(
      prisma,
      connectorCtx.definitionId,
      1
    ).catch(Function.prototype as () => void);

    return c.json({ success: true, documentId }, 200);
  } catch (error) {
    logger.error(
      { error, connectorId: connectorCtx.connectorId },
      "Delete document error"
    );
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      500
    );
  }
};

export const batchDeleteHandler: RouteHandler<
  typeof batchDeleteRoute,
  PushEnv
> = async (c) => {
  const connectorCtx = c.get("customConnector");
  const { ids } = c.req.valid("json");

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const vespaId = `${connectorCtx.connectorId}_custom_${id}`;
      const result = await deleteDocumentById(vespaId);
      return { id, result };
    })
  );

  const mapped = results.map((settled, index) => {
    if (settled.status === "fulfilled") {
      return settled.value.result.success
        ? { id: settled.value.id, success: true }
        : {
            id: settled.value.id,
            success: false,
            error: settled.value.result.error ?? "Delete failed",
          };
    }
    return {
      id: ids[index] ?? "unknown",
      success: false,
      error:
        settled.reason instanceof Error
          ? settled.reason.message
          : "Unknown error",
    };
  });

  const succeeded = mapped.filter((r) => r.success).length;

  if (succeeded > 0) {
    decrementCustomConnectorDocuments(
      prisma,
      connectorCtx.definitionId,
      succeeded
    ).catch(Function.prototype as () => void);
  }

  return c.json(
    {
      total: ids.length,
      succeeded,
      failed: ids.length - succeeded,
      results: mapped,
    },
    200
  );
};

export const statusHandler: RouteHandler<typeof statusRoute, PushEnv> = async (
  c
) => {
  const connectorCtx = c.get("customConnector");

  const definition = await getCustomConnectorBySlug(
    prisma,
    connectorCtx.teamId,
    connectorCtx.slug
  );

  if (!definition) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Connector not found" } },
      404
    );
  }

  return c.json(
    {
      slug: definition.slug,
      name: definition.name,
      status: definition.connector.status,
      totalDocuments: definition.totalDocuments,
      totalPushes: definition.totalPushes,
      lastPushAt: definition.lastPushAt?.toISOString() ?? null,
      createdAt: definition.createdAt.toISOString(),
    },
    200
  );
};
