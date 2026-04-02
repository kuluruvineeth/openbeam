import type { CodaClient } from "../client";

type CodaDocSummary = {
  id: string;
  name: string;
  browserLink: string;
};

type CodaTableSummary = {
  id: string;
  name: string;
  tableType: string;
};

export type DocListResult = {
  success: boolean;
  docs?: Array<{ id: string; name: string; browserLink: string }>;
  error?: string;
};

export type TableListResult = {
  success: boolean;
  tables?: Array<{ id: string; name: string; tableType: string }>;
  error?: string;
};

export async function listCodaDocs(client: CodaClient): Promise<DocListResult> {
  try {
    const result = await client.get<{ items: CodaDocSummary[] }>("/docs", {
      limit: "50",
    });
    return {
      success: true,
      docs: result.items.map((d) => ({
        id: d.id,
        name: d.name,
        browserLink: d.browserLink,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list docs",
    };
  }
}

export async function listCodaTables(
  client: CodaClient,
  docId: string
): Promise<TableListResult> {
  try {
    const result = await client.get<{ items: CodaTableSummary[] }>(
      `/docs/${docId}/tables`,
      { limit: "100" }
    );
    return {
      success: true,
      tables: result.items.map((t) => ({
        id: t.id,
        name: t.name,
        tableType: t.tableType,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list tables",
    };
  }
}
