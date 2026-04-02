import type { MicrosoftGraphClient } from "../../microsoft/client";

export interface MailFolder {
  id: string;
  displayName: string;
  childFolderCount: number;
  totalItemCount?: number;
  unreadItemCount?: number;
}

export interface FolderLookupResult {
  success: boolean;
  data?: MailFolder[];
  error?: string;
}

export async function listMailFolders(
  client: MicrosoftGraphClient
): Promise<FolderLookupResult> {
  try {
    const result = await client.get<{ value: MailFolder[] }>(
      "/me/mailFolders",
      {
        $select:
          "id,displayName,childFolderCount,totalItemCount,unreadItemCount",
        $top: "100",
      }
    );

    return { success: true, data: result.value };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list mail folders",
    };
  }
}
