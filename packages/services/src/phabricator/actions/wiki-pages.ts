import type { PhabricatorClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateWikiPageParams {
  slug: string;
  title: string;
  content: string;
}

interface UpdateWikiPageParams {
  slug: string;
  content: string;
  title?: string;
}

export async function createWikiPage(
  client: PhabricatorClient,
  params: CreateWikiPageParams
): Promise<ActionResult> {
  try {
    const transactions = [
      { type: "title", value: params.title },
      { type: "content", value: params.content },
    ];

    const result = await client.post<{
      object: { id: number; phid: string };
    }>("phriction.document.edit", {
      objectIdentifier: params.slug,
      transactions,
    });

    return {
      success: true,
      id: String(result.object.id),
      url: `${client.instanceUrl}/w/${params.slug}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create wiki page",
    };
  }
}

export async function updateWikiPage(
  client: PhabricatorClient,
  params: UpdateWikiPageParams
): Promise<ActionResult> {
  try {
    const transactions: { type: string; value: string }[] = [
      { type: "content", value: params.content },
    ];

    if (params.title) {
      transactions.push({ type: "title", value: params.title });
    }

    const result = await client.post<{
      object: { id: number; phid: string };
    }>("phriction.document.edit", {
      objectIdentifier: params.slug,
      transactions,
    });

    return {
      success: true,
      id: String(result.object.id),
      url: `${client.instanceUrl}/w/${params.slug}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update wiki page",
    };
  }
}
