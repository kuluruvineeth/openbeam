import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import oauthAuthorize from "./oauth.authorize";
import oauthRegister from "./oauth.register";
import oauthRevoke from "./oauth.revoke";
import oauthToken from "./oauth.token";
import oauthWellKnown from "./oauth.well-known";

const oauth = new OpenAPIHono<AuthEnv>();

oauth.route("/", oauthWellKnown);
oauth.route("/oauth", oauthRegister);
oauth.route("/oauth", oauthAuthorize);
oauth.route("/oauth", oauthToken);
oauth.route("/oauth", oauthRevoke);

export default oauth;
