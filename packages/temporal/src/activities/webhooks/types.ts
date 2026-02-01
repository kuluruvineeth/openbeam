export interface VerifySignatureInput {
  payload: unknown;
  signature: string;
  connectorType: string;
  connectorId: string;
}

export interface VerifySignatureOutput {
  valid: boolean;
  reason?: string;
}

export interface ProcessWebhookEventInput {
  connectorType: string;
  eventType: string;
  payload: unknown;
}

export interface ProcessWebhookEventOutput {
  action: "sync_document" | "delete_document" | "revoke_auth" | "ignore";
  documentIds: string[];
}

export interface DeleteDocumentsInput {
  connectorId: string;
  documentIds: string[];
}

export interface RevokeConnectorInput {
  connectorId: string;
  reason: string;
}

export interface WebhookActivities {
  verifySignature(input: VerifySignatureInput): Promise<VerifySignatureOutput>;
  loadConnector(connectorId: string): Promise<{ id: string; type: string }>;
  processWebhookEvent(
    input: ProcessWebhookEventInput
  ): Promise<ProcessWebhookEventOutput>;
  deleteDocuments(input: DeleteDocumentsInput): Promise<void>;
  revokeConnector(input: RevokeConnectorInput): Promise<void>;
  upsertDocument(input: {
    connectorId: string;
    document: unknown;
  }): Promise<void>;
}
