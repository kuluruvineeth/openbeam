import type { Database } from "@openplane/db";
import type { VespaClient } from "@openplane/vespa";
import { createDeleteDocumentsActivity } from "./delete-documents";
import { createLoadConnectorActivity } from "./load-connector";
import { createProcessWebhookEventActivity } from "./process-event";
import { createRevokeConnectorActivity } from "./revoke-connector";
import type { WebhookActivities } from "./types";
import { createUpsertDocumentActivity } from "./upsert-document";
import { createVerifySignatureActivity } from "./verify-signature";

export interface WebhookActivityDependencies {
  db: Database;
  vespa: VespaClient;
}

export function createWebhookActivities(
  deps: WebhookActivityDependencies
): WebhookActivities {
  const { db, vespa } = deps;

  return {
    verifySignature: createVerifySignatureActivity({ db }),
    loadConnector: createLoadConnectorActivity({ db }),
    processWebhookEvent: createProcessWebhookEventActivity(),
    revokeConnector: createRevokeConnectorActivity({ db }),
    deleteDocuments: createDeleteDocumentsActivity({ vespa }),
    upsertDocument: createUpsertDocumentActivity({ vespa }),
  };
}

export type {
  DeleteDocumentsInput,
  ProcessWebhookEventInput,
  ProcessWebhookEventOutput,
  RevokeConnectorInput,
  VerifySignatureInput,
  VerifySignatureOutput,
  WebhookActivities,
} from "./types";
