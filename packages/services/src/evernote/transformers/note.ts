import type { EvernoteTransformContext } from "@openbeam/types/services/connectors/evernote";
import type { GenericDocument } from "@openbeam/vespa";
import type { EvernoteNotebook } from "../api/notebooks";
import type { EvernoteNoteMetadata } from "../api/notes";
import { buildEvernoteNoteUrl, buildTagList, stripEnml } from "./utils";

export function transformNote(
  note: EvernoteNoteMetadata,
  context: EvernoteTransformContext,
  notebookMap: Map<string, EvernoteNotebook>,
  rawContent?: string
): GenericDocument {
  const notebook = note.notebookGuid
    ? notebookMap.get(note.notebookGuid)
    : undefined;
  const parts: string[] = [];

  if (rawContent) {
    const plainText = stripEnml(rawContent);
    if (plainText) {
      parts.push(plainText);
    }
  }

  if (notebook?.name) {
    parts.push(`Notebook: ${notebook.name}`);
  }

  const tagList = buildTagList(note.tagNames);
  if (tagList) {
    parts.push(`Tags: ${tagList}`);
  }

  if (note.attributes?.source) {
    parts.push(`Source: ${note.attributes.source}`);
  }

  if (note.attributes?.sourceURL) {
    parts.push(`Source URL: ${note.attributes.sourceURL}`);
  }

  const content = parts.join("\n\n");

  return {
    id: `${context.connectorId}_note_${note.guid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: note.guid,
    document_type: "document",
    title: note.title ?? "",
    content,
    created_at: note.created ?? 0,
    updated_at: note.updated ?? 0,
    url: buildEvernoteNoteUrl(note.guid, context.environment),
    author_name: note.attributes?.author,
    is_public: false,
    access_control: [],
    metadata: {
      ...(notebook?.name && { notebook: notebook.name }),
      ...(notebook?.stack && { stack: notebook.stack }),
      ...(tagList && { tags: tagList }),
      ...(note.attributes?.source && { source: note.attributes.source }),
      ...(note.contentLength && { contentLength: String(note.contentLength) }),
      ...(note.notebookGuid && { notebookGuid: note.notebookGuid }),
    },
  };
}
