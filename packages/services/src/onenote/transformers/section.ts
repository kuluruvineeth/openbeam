import type { OneNoteTransformContext } from "@openbeam/types/services/connectors/onenote";
import type { GenericDocument } from "@openbeam/vespa";
import type { OneNoteSection } from "../api/sections";

export function transformOneNoteSection(
  section: OneNoteSection,
  context: OneNoteTransformContext
): GenericDocument {
  const createdAt = new Date(section.createdDateTime).getTime();
  const updatedAt = new Date(section.lastModifiedDateTime).getTime();
  const authorName = section.createdBy.user?.displayName;
  const notebookName = section.parentNotebook?.displayName;
  const webUrl = section.links?.oneNoteWebUrl?.href;

  const contentParts = [`Section: ${section.displayName}`];
  if (notebookName) {
    contentParts.push(`Notebook: ${notebookName}`);
  }

  return {
    id: `${context.connectorId}_section_${section.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: section.id,
    document_type: "folder",
    document_subtype: "section",
    title: section.displayName,
    content: contentParts.join(" — "),
    created_at: createdAt,
    updated_at: updatedAt,
    url: webUrl,
    author_name: authorName,
    is_public: false,
    access_control: [],
    source_id: section.parentNotebook?.id,
    source_type: "notebook",
    metadata: {
      isDefault: section.isDefault,
      ...(notebookName && { notebookName }),
      ...(section.parentNotebook?.id && {
        notebookId: section.parentNotebook.id,
      }),
      ...(section.parentSectionGroup?.displayName && {
        sectionGroupName: section.parentSectionGroup.displayName,
      }),
      ...(authorName && { createdBy: authorName }),
    },
  };
}
