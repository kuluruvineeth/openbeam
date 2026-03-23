import type { MicrosoftGraphClient } from "../../microsoft/client";

export type OneNoteNotebook = {
  id: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isDefault: boolean;
  isShared: boolean;
  createdBy: {
    user?: { id?: string; displayName?: string };
  };
  lastModifiedBy: {
    user?: { id?: string; displayName?: string };
  };
  links?: {
    oneNoteClientUrl?: { href: string };
    oneNoteWebUrl?: { href: string };
  };
  sectionsUrl: string;
  sectionGroupsUrl: string;
};

export function listNotebooks(
  client: MicrosoftGraphClient
): AsyncGenerator<OneNoteNotebook[], void, undefined> {
  return client.paginate<OneNoteNotebook>("/me/onenote/notebooks", {
    $orderby: "lastModifiedDateTime desc",
  });
}

export function getNotebook(
  client: MicrosoftGraphClient,
  notebookId: string
): Promise<OneNoteNotebook> {
  return client.get<OneNoteNotebook>(`/me/onenote/notebooks/${notebookId}`);
}
