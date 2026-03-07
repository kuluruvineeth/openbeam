import { OpenAPIHono } from "@hono/zod-openapi";
import { createGoogleProvider, oauthManager } from "@openbeam/auth";
import {
  callbackHandler,
  sessionHandler,
  signinHandler,
  signoutHandler,
} from "./auth.handlers";
import {
  callbackRoute,
  sessionRoute,
  signinRoute,
  signoutRoute,
} from "./auth.routes";

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthManager.register(
    createGoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

const authRouter = new OpenAPIHono();

authRouter.openapi(signinRoute, signinHandler);
authRouter.openapi(callbackRoute, callbackHandler);
authRouter.openapi(signoutRoute, signoutHandler);
authRouter.openapi(sessionRoute, sessionHandler);

export default authRouter;
