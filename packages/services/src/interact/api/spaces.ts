import type { InteractClient } from "../client";

export interface InteractSpace {
  Id: string;
  Name: string;
  Description?: string;
  Type?: string;
  MemberCount?: number;
  Url?: string;
  Owner?: {
    Id: string;
    DisplayName: string;
    Email?: string;
  };
  CreatedDate: string;
  ModifiedDate: string;
}

interface SpacesResponse {
  value: InteractSpace[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

interface ListSpacesOptions {
  modifiedAfter?: string;
}

export async function* listSpaces(
  client: InteractClient,
  options: ListSpacesOptions = {}
): AsyncGenerator<InteractSpace[], void, undefined> {
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

    const response = await client.get<SpacesResponse>("/spaces", params);

    if (response.value.length > 0) {
      yield response.value;
    }

    if (response.value.length < top) {
      break;
    }
    skip += top;
  }
}
