import type { MarketoTransformContext } from "@openbeam/types/services/connectors/marketo";
import type { GenericDocument } from "@openbeam/vespa";
import type { MarketoEmail } from "../api/emails";
import { buildMarketoUrl } from "./utils";

export function transformMarketoEmail(
  email: MarketoEmail,
  context: MarketoTransformContext
): GenericDocument {
  const subjectValue = email.subject?.value ?? null;
  const fromNameValue = email.fromName?.value ?? null;
  const fromEmailValue = email.fromEmail?.value ?? null;

  const parts = [
    email.description ?? null,
    subjectValue ? `Subject: ${subjectValue}` : null,
    fromNameValue ? `From: ${fromNameValue}` : null,
    fromEmailValue ? `From Email: ${fromEmailValue}` : null,
    email.status ? `Status: ${email.status}` : null,
    email.workspace ? `Workspace: ${email.workspace}` : null,
    email.folder?.folderName ? `Folder: ${email.folder.folderName}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(email.createdAt).getTime();
  const updatedAt = new Date(email.updatedAt).getTime();

  return {
    id: `${context.connectorId}_email_${email.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(email.id),
    document_type: "email",
    document_subtype: email.status,
    title: email.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: email.url ?? buildMarketoUrl(context.munchkinId, "EM", email.id),
    author_name: fromNameValue ?? undefined,
    author_email: fromEmailValue ?? undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(subjectValue && { subject: subjectValue }),
      ...(fromNameValue && { fromName: fromNameValue }),
      ...(email.status && { status: email.status }),
      ...(email.workspace && { workspace: email.workspace }),
      operational: String(email.operational),
    },
  };
}
