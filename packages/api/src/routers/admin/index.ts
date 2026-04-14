import { createTRPCRouter } from "../../index";
import { adminAuditRouter } from "./audit";
import { adminConnectorsRouter } from "./connectors";
import { adminDashboardRouter } from "./dashboard";
import { adminMembersRouter } from "./members";

export const adminRouter = createTRPCRouter({
  dashboard: adminDashboardRouter,
  members: adminMembersRouter,
  connectors: adminConnectorsRouter,
  audit: adminAuditRouter,
});
