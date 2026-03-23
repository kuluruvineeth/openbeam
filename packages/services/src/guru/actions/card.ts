import type { GuruClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateCardParams {
  collectionId: string;
  title: string;
  content: string;
}

interface UpdateCardParams {
  cardId: string;
  title?: string;
  content?: string;
}

export async function createCard(
  client: GuruClient,
  params: CreateCardParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      id: string;
      slug?: string;
    }>("/cards", {
      preferredPhrase: params.title,
      content: params.content,
      collection: { id: params.collectionId },
    });

    const url = response.slug
      ? `https://app.getguru.com/card/${response.slug}`
      : `https://app.getguru.com/card/${response.id}`;

    return {
      success: true,
      id: response.id,
      url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create card",
    };
  }
}

export async function updateCard(
  client: GuruClient,
  params: UpdateCardParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {};
    if (params.title) {
      body.preferredPhrase = params.title;
    }
    if (params.content) {
      body.content = params.content;
    }

    const response = await client.put<{
      id: string;
      slug?: string;
    }>(`/cards/${params.cardId}`, body);

    const url = response.slug
      ? `https://app.getguru.com/card/${response.slug}`
      : `https://app.getguru.com/card/${response.id}`;

    return {
      success: true,
      id: response.id,
      url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update card",
    };
  }
}
