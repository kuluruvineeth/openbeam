import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  createApiKeyHandler,
  createDefinitionHandler,
  deleteDefinitionHandler,
  getDefinitionHandler,
  listApiKeysHandler,
  listDefinitionsHandler,
  revokeApiKeyHandler,
  updateDefinitionHandler,
} from "./management.handlers";
import {
  createApiKeyRoute,
  createDefinitionRoute,
  deleteDefinitionRoute,
  getDefinitionRoute,
  listApiKeysRoute,
  listDefinitionsRoute,
  revokeApiKeyRoute,
  updateDefinitionRoute,
} from "./management.routes";

const management = new OpenAPIHono<AuthEnv>();

management.use("/*", requireAuth);

management.openapi(createDefinitionRoute, createDefinitionHandler);
management.openapi(listDefinitionsRoute, listDefinitionsHandler);
management.openapi(getDefinitionRoute, getDefinitionHandler);
management.openapi(updateDefinitionRoute, updateDefinitionHandler);
management.openapi(deleteDefinitionRoute, deleteDefinitionHandler);
management.openapi(createApiKeyRoute, createApiKeyHandler);
management.openapi(listApiKeysRoute, listApiKeysHandler);
management.openapi(revokeApiKeyRoute, revokeApiKeyHandler);

export default management;
