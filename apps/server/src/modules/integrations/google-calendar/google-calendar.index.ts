import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  startOAuthHandler,
} from "./google-calendar.handlers";
import { oauthCallbackRoute, startOAuthRoute } from "./google-calendar.routes";

const googleCalendar = new OpenAPIHono<AuthEnv>();

googleCalendar.use("/*", requireAuth);

googleCalendar.openapi(startOAuthRoute, startOAuthHandler);
googleCalendar.openapi(oauthCallbackRoute, oauthCallbackHandler);

export default googleCalendar;
