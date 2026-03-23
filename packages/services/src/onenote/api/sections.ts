import type { MicrosoftGraphClient } from "../../microsoft/client";

export type OneNoteSection = {
  id: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isDefault: boolean;
  pagesUrl: string;
  createdBy: {
    user?: { id?: string; displayName?: string };
  };
  lastModifiedBy: {
    user?: { id?: string; displayName?: string };
  };
  parentNotebook?: {
    id: string;
    displayName: string;
  };
  parentSectionGroup?: {
    id: string;
    displayName: string;
  };
  links?: {
    oneNoteClientUrl?: { href: string };
    oneNoteWebUrl?: { href: string };
  };
};

export type OneNoteSectionGroup = {
  id: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  sectionsUrl: string;
  sectionGroupsUrl: string;
  parentNotebook?: {
    id: string;
    displayName: string;
  };
};

export function listSectionsInNotebook(
  client: MicrosoftGraphClient,
  notebookId: string
): AsyncGenerator<OneNoteSection[], void, undefined> {
  return client.paginate<OneNoteSection>(
    `/me/onenote/notebooks/${notebookId}/sections`
  );
}

export function listAllSections(
  client: MicrosoftGraphClient
): AsyncGenerator<OneNoteSection[], void, undefined> {
  return client.paginate<OneNoteSection>("/me/onenote/sections", {
    $orderby: "lastModifiedDateTime desc",
  });
}

export function listSectionGroups(
  client: MicrosoftGraphClient,
  notebookId: string
): AsyncGenerator<OneNoteSectionGroup[], void, undefined> {
  return client.paginate<OneNoteSectionGroup>(
    `/me/onenote/notebooks/${notebookId}/sectionGroups`
  );
}
