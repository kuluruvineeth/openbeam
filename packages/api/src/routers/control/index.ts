import { createTRPCRouter } from "../../index";
import { accessRouter } from "./access";
import { activityRouter } from "./activity";
import { adaptersRouter } from "./adapters";
import { agentsRouter } from "./agents";
import { approvalsRouter } from "./approvals";
import { costsRouter } from "./costs";
import { dashboardRouter } from "./dashboard";
import { goalsRouter } from "./goals";
import { heartbeatsRouter } from "./heartbeats";
import { issuesRouter } from "./issues";
import { projectsRouter } from "./projects";
import { controlRealtimeRouter } from "./realtime";
import { secretsRouter } from "./secrets";

export const controlRouter = createTRPCRouter({
  access: accessRouter,
  activity: activityRouter,
  adapters: adaptersRouter,
  agents: agentsRouter,
  approvals: approvalsRouter,
  costs: costsRouter,
  dashboard: dashboardRouter,
  goals: goalsRouter,
  heartbeats: heartbeatsRouter,
  issues: issuesRouter,
  projects: projectsRouter,
  realtime: controlRealtimeRouter,
  secrets: secretsRouter,
});
