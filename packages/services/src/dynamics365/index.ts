export type { RecordActionResult as Dynamics365RecordActionResult } from "./actions";
export {
  createDynamics365Account,
  createDynamics365Contact,
  createDynamics365Opportunity,
  updateDynamics365Account,
  updateDynamics365Contact,
  updateDynamics365Opportunity,
} from "./actions";
export type {
  Dynamics365Account,
  Dynamics365Activity,
  Dynamics365Case,
  Dynamics365Contact,
  Dynamics365Lead,
  Dynamics365Opportunity,
} from "./api";
export {
  listAllAccounts,
  listAllActivities,
  listAllCases,
  listAllContacts,
  listAllLeads,
  listAllOpportunities,
} from "./api";
export { Dynamics365Auth } from "./auth";
export type { Dynamics365Client, Dynamics365ClientConfig } from "./client";
export { createDynamics365Client } from "./client";
export { dynamics365FullSync } from "./sync/full";
export { dynamics365IncrementalSync } from "./sync/incremental";
export { transformDynamics365Account } from "./transformers/account";
export { transformDynamics365Activity } from "./transformers/activity";
export { transformDynamics365Case } from "./transformers/case";
export { transformDynamics365Contact } from "./transformers/contact";
export { transformDynamics365Lead } from "./transformers/lead";
export { transformDynamics365Opportunity } from "./transformers/opportunity";
export { Dynamics365ApiError } from "./types";
