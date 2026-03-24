import type { BenchlingClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateEntryParams {
  folderId: string;
  name: string;
  entryTemplateId?: string;
  schemaId?: string;
  fields?: Record<string, { value: unknown }>;
  authorIds?: string[];
}

interface UpdateEntryParams {
  entryId: string;
  name?: string;
  fields?: Record<string, { value: unknown }>;
  schemaId?: string;
}

export async function createEntry(
  client: BenchlingClient,
  params: CreateEntryParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      folderId: params.folderId,
      name: params.name,
      ...(params.entryTemplateId && {
        entryTemplateId: params.entryTemplateId,
      }),
      ...(params.schemaId && { schemaId: params.schemaId }),
      ...(params.fields && { fields: params.fields }),
      ...(params.authorIds?.length && { authorIds: params.authorIds }),
    };

    const result = await client.post<{
      id: string;
      webURL: string;
    }>("/entries", body);

    return {
      success: true,
      id: result.id,
      url: result.webURL,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create entry",
    };
  }
}

export async function updateEntry(
  client: BenchlingClient,
  params: UpdateEntryParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      ...(params.name && { name: params.name }),
      ...(params.fields && { fields: params.fields }),
      ...(params.schemaId && { schemaId: params.schemaId }),
    };

    const result = await client.patch<{
      id: string;
      webURL: string;
    }>(`/entries/${params.entryId}`, body);

    return {
      success: true,
      id: result.id,
      url: result.webURL,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update entry",
    };
  }
}
