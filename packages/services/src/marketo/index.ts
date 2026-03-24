export type { RecordActionResult as MarketoRecordActionResult } from "./actions";
export { createOrUpdateMarketoLead, triggerMarketoCampaign } from "./actions";
export type {
  MarketoActivity,
  MarketoActivityType,
  MarketoCampaign,
  MarketoEmail,
  MarketoLandingPage,
  MarketoLead,
  MarketoProgram,
} from "./api";
export {
  getPagingToken,
  listActivities,
  listActivityTypes,
  listAllCampaigns,
  listAllEmails,
  listAllLandingPages,
  listAllLeads,
  listAllLeadsViaLists,
  listAllPrograms,
  listAllStaticLists,
} from "./api";
export { MarketoAuth } from "./auth";
export type { MarketoClient } from "./client";
export { createMarketoClient } from "./client";
export { marketoFullSync } from "./sync/full";
export { marketoIncrementalSync } from "./sync/incremental";
export { transformMarketoActivity } from "./transformers/activity";
export { transformMarketoCampaign } from "./transformers/campaign";
export { transformMarketoEmail } from "./transformers/email";
export { transformMarketoLandingPage } from "./transformers/landing-page";
export { transformMarketoLead } from "./transformers/lead";
export { transformMarketoProgram } from "./transformers/program";
export { MarketoApiError } from "./types";
