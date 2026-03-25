import type { InteractClient } from "../client";

export interface InteractPerson {
  Id: string;
  FirstName: string;
  LastName: string;
  DisplayName: string;
  Email: string;
  JobTitle?: string;
  Department?: string;
  Location?: string;
  Phone?: string;
  Bio?: string;
  ProfileImageUrl?: string;
  Manager?: {
    Id: string;
    DisplayName: string;
    Email?: string;
  };
  Status: string;
  CreatedDate: string;
  ModifiedDate: string;
}

interface PeopleResponse {
  value: InteractPerson[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

interface ListPeopleOptions {
  modifiedAfter?: string;
}

export async function* listPeople(
  client: InteractClient,
  options: ListPeopleOptions = {}
): AsyncGenerator<InteractPerson[], void, undefined> {
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

    const response = await client.get<PeopleResponse>("/people", params);

    if (response.value.length > 0) {
      yield response.value;
    }

    if (response.value.length < top) {
      break;
    }
    skip += top;
  }
}
