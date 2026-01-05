import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import {
  costBreakdownHandler,
  executeSpreadsheetQueryHandler,
  generateSpreadsheetSqlHandler,
  getSpreadsheetSchemaHandler,
  listSpreadsheetsHandler,
  topCostDriversHandler,
  usageTrendHandler,
} from "./analytics.handlers";
import {
  costBreakdownRoute,
  executeSpreadsheetQueryRoute,
  generateSpreadsheetSqlRoute,
  getSpreadsheetSchemaRoute,
  listSpreadsheetsRoute,
  topCostDriversRoute,
  usageTrendRoute,
} from "./analytics.routes";

const analytics = new OpenAPIHono<AuthEnv>();

analytics.use("/*", requireAuth);
analytics.use("/*", requireScopes([API_SCOPES.ANALYTICS_READ]));

analytics.openapi(costBreakdownRoute, costBreakdownHandler);
analytics.openapi(usageTrendRoute, usageTrendHandler);
analytics.openapi(topCostDriversRoute, topCostDriversHandler);

analytics.openapi(listSpreadsheetsRoute, listSpreadsheetsHandler);
analytics.openapi(getSpreadsheetSchemaRoute, getSpreadsheetSchemaHandler);
analytics.openapi(generateSpreadsheetSqlRoute, generateSpreadsheetSqlHandler);
analytics.openapi(executeSpreadsheetQueryRoute, executeSpreadsheetQueryHandler);

export default analytics;
