import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  oauthCallbackHandler,
  serviceAccountAuthHandler,
  startOAuthHandler,
} from "./google-drive.handlers";
import {
  oauthCallbackRoute,
  serviceAccountAuthRoute,
  startOAuthRoute,
} from "./google-drive.routes";

const googleDrive = new OpenAPIHono<AuthEnv>();

googleDrive.use("/*", requireAuth);

googleDrive.openapi(startOAuthRoute, startOAuthHandler);

googleDrive.openapi(oauthCallbackRoute, oauthCallbackHandler);

googleDrive.openapi(serviceAccountAuthRoute, serviceAccountAuthHandler);

export default googleDrive;
