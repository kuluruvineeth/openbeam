import { OpenAPIHono } from "@hono/zod-openapi";
import { apiKeyAuth } from "@/middleware/api-key";
import type { AuthEnv } from "@/middleware/auth";
import { sessionMiddleware } from "@/middleware/auth";
import management from "./management/management.index";
import pushApi from "./push-api/push.index";

const customConnectors = new OpenAPIHono<AuthEnv>();

customConnectors.use("/manage/*", apiKeyAuth);
customConnectors.use("/manage/*", sessionMiddleware);
customConnectors.route("/manage", management);

customConnectors.route("/push", pushApi);

export default customConnectors;
