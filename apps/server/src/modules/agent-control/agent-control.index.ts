import { OpenAPIHono } from "@hono/zod-openapi";
import { agentAuth, requireAgentAuth } from "@/middleware/agent-auth";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import {
  appendRunEventHandler,
  checkoutIssueHandler,
  commentIssueHandler,
  completeRunHandler,
  getIdentityHandler,
  listIssuesHandler,
  releaseIssueHandler,
  updateIssueHandler,
  updateStatusHandler,
  wakeupHandler,
} from "./agent-control.handlers";
import {
  appendRunEventRoute,
  checkoutIssueRoute,
  commentIssueRoute,
  completeRunRoute,
  getIdentityRoute,
  listIssuesRoute,
  releaseIssueRoute,
  updateIssueRoute,
  updateStatusRoute,
  wakeupRoute,
} from "./agent-control.routes";

const app = new OpenAPIHono<AuthEnv>();

app.use("/*", agentAuth);
app.use("/*", requireAuth);
app.use("/*", requireAgentAuth);

app.openapi(getIdentityRoute, getIdentityHandler);
app.openapi(updateStatusRoute, updateStatusHandler);
app.openapi(listIssuesRoute, listIssuesHandler);
app.openapi(checkoutIssueRoute, checkoutIssueHandler);
app.openapi(releaseIssueRoute, releaseIssueHandler);
app.openapi(commentIssueRoute, commentIssueHandler);
app.openapi(updateIssueRoute, updateIssueHandler);
app.openapi(wakeupRoute, wakeupHandler);
app.openapi(appendRunEventRoute, appendRunEventHandler);
app.openapi(completeRunRoute, completeRunHandler);

export default app;
