import type { EvernoteClient } from "../client";

export interface NoteActionResult {
  success: boolean;
  noteGuid?: string;
  url?: string;
  error?: string;
}

interface CreateNoteParams {
  title: string;
  content: string;
  notebookGuid?: string;
  tagNames?: string[];
}

export async function createNote(
  client: EvernoteClient,
  params: CreateNoteParams
): Promise<NoteActionResult> {
  try {
    const enmlContent = wrapInEnml(params.content);
    const body: Record<string, unknown> = {
      title: params.title,
      content: enmlContent,
    };
    if (params.notebookGuid) {
      body.notebookGuid = params.notebookGuid;
    }
    if (params.tagNames && params.tagNames.length > 0) {
      body.tagNames = params.tagNames;
    }

    const result = await client.post<{ guid: string }>("/notes", body);
    return {
      success: true,
      noteGuid: result.guid,
      url: `https://www.evernote.com/shard/s1/nl/${result.guid}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

interface UpdateNoteParams {
  noteGuid: string;
  title?: string;
  content?: string;
  tagNames?: string[];
}

export async function updateNote(
  client: EvernoteClient,
  params: UpdateNoteParams
): Promise<NoteActionResult> {
  try {
    const body: Record<string, unknown> = { guid: params.noteGuid };
    if (params.title) {
      body.title = params.title;
    }
    if (params.content) {
      body.content = wrapInEnml(params.content);
    }
    if (params.tagNames) {
      body.tagNames = params.tagNames;
    }

    await client.put(`/notes/${params.noteGuid}`, body);
    return {
      success: true,
      noteGuid: params.noteGuid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update note",
    };
  }
}

export async function deleteNote(
  client: EvernoteClient,
  noteGuid: string
): Promise<NoteActionResult> {
  try {
    await client.del(`/notes/${noteGuid}`);
    return {
      success: true,
      noteGuid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}

function wrapInEnml(plainText: string): string {
  const escaped = plainText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const htmlBody = escaped
    .split("\n")
    .map((line) => `<div>${line || "<br/>"}</div>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${htmlBody}</en-note>`;
}
