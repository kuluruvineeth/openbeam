/**
 * Vespa Clients - Central Export
 *
 * Specialized clients for each Vespa schema.
 */

// Base client
export {
  BaseVespaClient,
  type FeedOptions,
  type VespaClientConfig,
} from "./base-client";
// Code client
export { CodeClient, codeClient } from "./code-client";
// Document client
export {
  DocumentClient,
  type DocumentSearchOptions,
  documentClient,
} from "./document-client";
// Entity client
export { EntityClient, entityClient } from "./entity-client";
// Person client
export { PersonClient, personClient } from "./person-client";
