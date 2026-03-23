import type { DatadogClient } from "../client";

export interface DatadogServiceDefinition {
  type: "service-definition";
  id: string;
  attributes: {
    meta: {
      "last-modified-time"?: string;
    };
    schema: {
      "dd-service": string;
      team?: string;
      description?: string;
      application?: string;
      tier?: string;
      lifecycle?: string;
      contacts?: Array<{
        name?: string;
        type: string;
        contact: string;
      }>;
      links?: Array<{
        name: string;
        type: string;
        url: string;
      }>;
      tags?: string[];
      "schema-version": string;
    };
  };
}

interface ServiceListResponse {
  data: DatadogServiceDefinition[];
}

export async function* listServices(
  client: DatadogClient,
  options: { pageSize?: number } = {}
): AsyncGenerator<DatadogServiceDefinition[], void, undefined> {
  const { pageSize = 100 } = options;
  let pageNumber = 0;

  while (true) {
    const response = await client.get<ServiceListResponse>(
      "/api/v2/services/definitions",
      {
        "page[size]": String(pageSize),
        "page[number]": String(pageNumber),
      }
    );

    const services = response.data ?? [];
    if (services.length > 0) {
      yield services;
    }

    if (services.length < pageSize) {
      break;
    }

    pageNumber += 1;
  }
}
