import type { InteractClient } from "../client";

export interface InteractDocument {
  Id: string;
  Title: string;
  Description?: string;
  FileName?: string;
  FileType?: string;
  FileSize?: number;
  Url?: string;
  Author?: {
    Id: string;
    DisplayName: string;
    Email?: string;
  };
  CreatedDate: string;
  ModifiedDate: string;
}

interface DocumentsResponse {
  value: InteractDocument[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

interface ListDocumentsOptions {
  modifiedAfter?: string;
}

export async function* listDocuments(
  client: InteractClient,
  options: ListDocumentsOptions = {}
): AsyncGenerator<InteractDocument[], void, undefined> {
  let skip = 0;
  const top = 100;

  while (true) {
    const params: Record<string, string> = {
      $skip: String(skip),
      $top: String(top),
      $count: "true",
    };

    if (options.modifiedAfter) {
      params.$filter = `ModifiedDate gt ${options.modifiedAfter}`;
    }

    const response = await client.get<DocumentsResponse>("/documents", params);

    if (response.value.length > 0) {
      yield response.value;
    }

    if (response.value.length < top) {
      break;
    }
    skip += top;
  }
}
