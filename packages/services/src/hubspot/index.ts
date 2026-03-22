export type { RecordActionResult as HubSpotRecordActionResult } from "./actions";
export { createHubSpotRecord, updateHubSpotRecord } from "./actions";
export type {
  HubSpotCompany,
  HubSpotContact,
  HubSpotDeal,
  HubSpotTicket,
} from "./api";
export {
  listAllCompanies,
  listAllContacts,
  listAllDeals,
  listAllTickets,
  searchCompaniesModifiedAfter,
  searchContactsModifiedAfter,
  searchDealsModifiedAfter,
  searchTicketsModifiedAfter,
} from "./api";
export { HubSpotAuth } from "./auth";
export type { HubSpotClient, HubSpotClientConfig } from "./client";
export { createHubSpotClient } from "./client";
export { hubspotFullSync } from "./sync/full";
export { hubspotIncrementalSync } from "./sync/incremental";
export { transformHubSpotCompany } from "./transformers/company";
export { transformHubSpotContact } from "./transformers/contact";
export { transformHubSpotDeal } from "./transformers/deal";
export { transformHubSpotTicket } from "./transformers/ticket";
export { HubSpotApiError } from "./types";
