import type {
  FhirDocumentReference,
  FhirTransformContext,
} from "@openplane/types/services/connectors/fhir";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";

function getDocumentTitle(doc: FhirDocumentReference): string {
  if (doc.description) {
    return doc.description;
  }
  return (
    doc.type?.text ?? doc.type?.coding?.[0]?.display ?? `Document ${doc.id}`
  );
}

function buildDocumentContent(doc: FhirDocumentReference): string {
  const parts: string[] = [];

  parts.push(`Document: ${getDocumentTitle(doc)}`);
  parts.push(`Status: ${doc.status}`);

  const docType = doc.type?.text ?? doc.type?.coding?.[0]?.display;
  if (docType) {
    parts.push(`Type: ${docType}`);
  }

  const category = doc.category?.[0];
  if (category) {
    parts.push(
      `Category: ${category.text ?? category.coding?.[0]?.display ?? ""}`
    );
  }

  if (doc.content?.length) {
    for (const entry of doc.content) {
      if (entry.attachment?.title) {
        parts.push(`Attachment: ${entry.attachment.title}`);
      }
      if (entry.attachment?.contentType) {
        parts.push(`Content-Type: ${entry.attachment.contentType}`);
      }
    }
  }

  if (doc.author?.length) {
    parts.push(`Authors: ${doc.author.length}`);
  }

  return parts.join("\n");
}

function buildDocumentMetadata(
  doc: FhirDocumentReference
): GenericDocument["metadata"] {
  const documentType = doc.type?.coding?.[0]?.code;
  const documentTypeDisplay = doc.type?.text ?? doc.type?.coding?.[0]?.display;
  const category =
    doc.category?.[0]?.text ?? doc.category?.[0]?.coding?.[0]?.display;
  const contentType = doc.content?.[0]?.attachment?.contentType;

  return {
    resourceType: "DocumentReference",
    fhirId: doc.id,
    status: doc.status,
    ...(documentType != null && { documentType }),
    ...(documentTypeDisplay != null && { documentTypeDisplay }),
    ...(category != null && { category }),
    ...(contentType != null && { contentType }),
    ...(doc.content?.length != null && {
      attachmentCount: doc.content.length,
    }),
  };
}

export async function transformDocumentReference(
  doc: FhirDocumentReference,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const title = getDocumentTitle(doc);
  const content = buildDocumentContent(doc);
  const metadata = buildDocumentMetadata(doc);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_document_${doc.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: doc.id,
    document_type: "healthcare_document",
    title,
    content,
    created_at: doc.date ? new Date(doc.date).getTime() : Date.now(),
    updated_at: doc.meta?.lastUpdated
      ? new Date(doc.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/DocumentReference/${doc.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
