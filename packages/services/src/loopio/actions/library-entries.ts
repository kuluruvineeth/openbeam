import type { LoopioClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateLibraryEntryParams {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
}

interface UpdateLibraryEntryParams {
  entryId: string;
  question?: string;
  answer?: string;
  category?: string;
  tags?: string[];
}

export async function createLibraryEntry(
  client: LoopioClient,
  params: CreateLibraryEntryParams
): Promise<ActionResult> {
  try {
    const body = {
      library_entry: {
        question: params.question,
        answer: params.answer,
        ...(params.category && { category: params.category }),
        ...(params.tags?.length && { tags: params.tags }),
      },
    };

    const result = await client.post<{
      library_entry: { id: string };
    }>("/library", body);

    return {
      success: true,
      id: result.library_entry.id,
      url: `https://app.loopio.com/library/${result.library_entry.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create library entry",
    };
  }
}

export async function updateLibraryEntry(
  client: LoopioClient,
  params: UpdateLibraryEntryParams
): Promise<ActionResult> {
  try {
    const body = {
      library_entry: {
        ...(params.question && { question: params.question }),
        ...(params.answer && { answer: params.answer }),
        ...(params.category && { category: params.category }),
        ...(params.tags?.length && { tags: params.tags }),
      },
    };

    const result = await client.put<{
      library_entry: { id: string };
    }>(`/library/${params.entryId}`, body);

    return {
      success: true,
      id: result.library_entry.id,
      url: `https://app.loopio.com/library/${result.library_entry.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update library entry",
    };
  }
}
