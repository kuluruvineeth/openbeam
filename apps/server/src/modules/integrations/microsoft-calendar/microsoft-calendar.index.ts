import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
} from "./microsoft-calendar.handlers";
import {
  oauthCallbackRoute,
  startOAuthRoute,
} from "./microsoft-calendar.routes";

const microsoftCalendar = new OpenAPIHono<AuthEnv>();

microsoftCalendar.use("/*", requireAuth);

microsoftCalendar.openapi(startOAuthRoute, startOAuthHandler);

microsoftCalendar.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default microsoftCalendar;
