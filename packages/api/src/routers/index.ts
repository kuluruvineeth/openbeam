import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../index";
import { agentCanvasRouter } from "./agent-canvas";
import { aiRouter } from "./ai";
import { analyticsRouter } from "./analytics";
import { apiKeysRouter } from "./api-keys";
import { appsRouter } from "./apps";
import { backgroundAgentsRouter } from "./background-agents";
import { connectorResourcesRouter } from "./connector-resources";
import { contextRouter } from "./context";
import { controlRouter } from "./control";
import { customConnectorsRouter } from "./custom-connectors";
import { filesRouter } from "./files";
import { jobsRouter } from "./jobs";
import { knowledgeRouter } from "./knowledge";
import { mediaRouter } from "./media";
import { messagesRouter } from "./messages";
import { oauthApplicationsRouter } from "./oauth-applications";
import { overviewRouter } from "./overview";
import { paymentsRouter } from "./payments";
import { permissionsRouter } from "./permissions";
import { personalizationRouter } from "./personalization";
import { ragRouter } from "./rag";
import { researchRouter } from "./research";
import { searchRouter } from "./search";
import { teamRouter } from "./team";
import { userRouter } from "./user";
import { voiceRouter } from "./voice";
import { workspaceRouter } from "./workspace";

export const appRouter = createTRPCRouter({
  apiKeys: apiKeysRouter,
  agentCanvas: agentCanvasRouter,
  ai: aiRouter,
  analytics: analyticsRouter,
  apps: appsRouter,
  backgroundAgents: backgroundAgentsRouter,
  connectorResources: connectorResourcesRouter,
  context: contextRouter,
  control: controlRouter,
  customConnectors: customConnectorsRouter,
  files: filesRouter,
  jobs: jobsRouter,
  knowledge: knowledgeRouter,
  media: mediaRouter,
  messages: messagesRouter,
  oauthApplications: oauthApplicationsRouter,
  overview: overviewRouter,
  payments: paymentsRouter,
  permissions: permissionsRouter,
  personalization: personalizationRouter,
  rag: ragRouter,
  research: researchRouter,
  search: searchRouter,
  team: teamRouter,
  user: userRouter,
  voice: voiceRouter,
  workspace: workspaceRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
