import type { LoopioClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: number;
  url?: string;
  error?: string;
}

interface CreateLibraryEntryParams {
  stackID: number;
  questionText: string;
  text: string;
  categoryID?: number;
  subCategoryID?: number;
  languageCode?: string;
  questionComplianceOption?: string;
  tags?: string[];
}

interface UpdateLibraryEntryParams {
  libraryEntryId: number;
  op: string;
  path: string;
  value: string;
}

interface LoopioLibraryEntry {
  id: number;
  questions?: Array<{ id: number; text: string }>;
  answer?: { text: string };
  location?: {
    stack?: { id: number; name: string };
    category?: { id: number; name: string };
    subCategory?: { id: number; name: string };
  };
}

export async function createLibraryEntry(
  client: LoopioClient,
  params: CreateLibraryEntryParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      stackID: params.stackID,
      questionText: params.questionText,
      text: params.text,
    };

    if (params.categoryID !== undefined) {
      body.categoryID = params.categoryID;
    }
    if (params.subCategoryID !== undefined) {
      body.subCategoryID = params.subCategoryID;
    }
    if (params.languageCode) {
      body.languageCode = params.languageCode;
    }
    if (params.questionComplianceOption) {
      body.questionComplianceOption = params.questionComplianceOption;
    }
    if (params.tags?.length) {
      body.tags = params.tags;
    }

    const result = await client.post<LoopioLibraryEntry>("/library", body);

    return {
      success: true,
      id: result.id,
      url: `https://app.loopio.com/library/${String(result.id)}`,
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
    const patchBody = {
      op: params.op,
      path: params.path,
      value: params.value,
    };

    const result = await client.patch<LoopioLibraryEntry>(
      `/library/${String(params.libraryEntryId)}`,
      patchBody
    );

    return {
      success: true,
      id: result.id,
      url: `https://app.loopio.com/library/${String(result.id)}`,
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
