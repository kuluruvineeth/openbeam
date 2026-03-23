import type { DocuSignTransformContext } from "@openbeam/types/services/connectors/docusign";
import type { GenericDocument } from "@openbeam/vespa";
import type { DocuSignEnvelope } from "../api/envelopes";
import { buildDocuSignUrl, stripHtml } from "./utils";

export function transformDocuSignEnvelope(
  envelope: DocuSignEnvelope,
  context: DocuSignTransformContext
): GenericDocument {
  const signers = envelope.recipients?.signers ?? [];
  const carbonCopies = envelope.recipients?.carbonCopies ?? [];
  const allRecipients = [...signers, ...carbonCopies];

  const recipientNames = allRecipients
    .map((r) => `${r.name} (${r.email})`)
    .join(", ");

  const recipientStatuses = signers
    .map((r) => `${r.name}: ${r.status}`)
    .join(", ");

  const parts = [
    envelope.emailBlurb ? stripHtml(envelope.emailBlurb) : null,
    recipientNames ? `Recipients: ${recipientNames}` : null,
    recipientStatuses ? `Signing status: ${recipientStatuses}` : null,
    envelope.voidedReason ? `Voided: ${envelope.voidedReason}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(envelope.createdDateTime).getTime();
  const updatedAt = new Date(envelope.lastModifiedDateTime).getTime();

  return {
    id: `${context.connectorId}_envelope_${envelope.envelopeId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: envelope.envelopeId,
    document_type: "envelope",
    document_subtype: envelope.status,
    title: envelope.emailSubject || "Untitled Envelope",
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDocuSignUrl(
      context.accountBaseUri,
      context.accountId,
      "envelope",
      envelope.envelopeId
    ),
    author_name: envelope.sender?.userName,
    author_email: envelope.sender?.email,
    is_public: false,
    access_control: [],
    metadata: {
      status: envelope.status,
      ...(envelope.sentDateTime && { sentDate: envelope.sentDateTime }),
      ...(envelope.completedDateTime && {
        completedDate: envelope.completedDateTime,
      }),
      ...(envelope.voidedDateTime && {
        voidedDate: envelope.voidedDateTime,
      }),
      recipientCount: String(allRecipients.length),
      signerCount: String(signers.length),
      ...(recipientNames && { recipients: recipientNames }),
    },
  };
}
