import type { MicrosoftGraphClient } from "../../microsoft/client";

export type OneNotePage = {
  id: string;
  title: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  contentUrl: string;
  createdByAppId?: string;
  level: number;
  order: number;
  links?: {
    oneNoteClientUrl?: { href: string };
    oneNoteWebUrl?: { href: string };
  };
  parentSection?: {
    id: string;
    displayName: string;
  };
  parentNotebook?: {
    id: string;
    displayName: string;
  };
  userTags?: string[];
};

const PAGE_SELECT_FIELDS =
  "id,title,createdDateTime,lastModifiedDateTime,contentUrl,level,order,links,parentSection,parentNotebook,userTags";

export function listPagesInSection(
  client: MicrosoftGraphClient,
  sectionId: string
): AsyncGenerator<OneNotePage[], void, undefined> {
  return client.paginate<OneNotePage>(
    `/me/onenote/sections/${sectionId}/pages`,
    {
      $orderby: "lastModifiedDateTime desc",
      $select: PAGE_SELECT_FIELDS,
    }
  );
}

export function listAllPages(
  client: MicrosoftGraphClient,
  params?: Record<string, string>
): AsyncGenerator<OneNotePage[], void, undefined> {
  return client.paginate<OneNotePage>("/me/onenote/pages", {
    $orderby: "lastModifiedDateTime desc",
    $select: PAGE_SELECT_FIELDS,
    ...params,
  });
}

export function listPagesModifiedSince(
  client: MicrosoftGraphClient,
  sinceIso: string
): AsyncGenerator<OneNotePage[], void, undefined> {
  return client.paginate<OneNotePage>("/me/onenote/pages", {
    $filter: `lastModifiedDateTime ge ${sinceIso}`,
    $orderby: "lastModifiedDateTime desc",
    $select: PAGE_SELECT_FIELDS,
  });
}

export function getPageContent(
  client: MicrosoftGraphClient,
  pageId: string
): Promise<string> {
  return client.get<string>(`/me/onenote/pages/${pageId}/content`);
}
