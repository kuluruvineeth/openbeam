import { OpenAPIHono } from "@hono/zod-openapi";
import {
  type CustomConnectorAuthEnv,
  customConnectorAuth,
  requireCustomConnectorScope,
} from "@/middleware/custom-connector-auth";
import { customConnectorRateLimit } from "@/middleware/custom-connector-rate-limit";
import {
  batchDeleteHandler,
  batchPushHandler,
  deleteDocumentHandler,
  pushDocumentHandler,
  statusHandler,
} from "./push.handlers";
import {
  batchDeleteRoute,
  batchPushRoute,
  deleteDocumentRoute,
  pushDocumentRoute,
  statusRoute,
} from "./push.routes";

const pushApi = new OpenAPIHono<CustomConnectorAuthEnv>();

pushApi.use("/*", customConnectorAuth);
pushApi.use("/*", customConnectorRateLimit);

pushApi.use("/:slug/documents", requireCustomConnectorScope("push"));
pushApi.use("/:slug/documents/batch", requireCustomConnectorScope("push"));
pushApi.use("/:slug/documents/delete", requireCustomConnectorScope("delete"));

pushApi.openapi(pushDocumentRoute, pushDocumentHandler);
pushApi.openapi(batchPushRoute, batchPushHandler);
pushApi.openapi(deleteDocumentRoute, deleteDocumentHandler);
pushApi.openapi(batchDeleteRoute, batchDeleteHandler);
pushApi.openapi(statusRoute, statusHandler);

export default pushApi;
