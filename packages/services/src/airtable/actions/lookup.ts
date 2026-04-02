import type { AirtableClient } from "../client";

type AirtableBase = {
  id: string;
  name: string;
  permissionLevel: string;
};

type AirtableField = {
  id: string;
  name: string;
  type: string;
  description?: string;
};

type AirtableTable = {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: AirtableField[];
};

export type BaseListResult = {
  success: boolean;
  bases?: Array<{ id: string; name: string; permissionLevel: string }>;
  error?: string;
};

export type TableListResult = {
  success: boolean;
  tables?: Array<{
    id: string;
    name: string;
    description?: string;
    primaryFieldId: string;
    fields: Array<{ id: string; name: string; type: string }>;
  }>;
  error?: string;
};

export async function listAirtableBases(
  client: AirtableClient
): Promise<BaseListResult> {
  try {
    const result = await client.get<{ bases: AirtableBase[] }>("/meta/bases");
    return {
      success: true,
      bases: result.bases.map((b) => ({
        id: b.id,
        name: b.name,
        permissionLevel: b.permissionLevel,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list bases",
    };
  }
}

export async function listAirtableTables(
  client: AirtableClient,
  baseId: string
): Promise<TableListResult> {
  try {
    const result = await client.get<{ tables: AirtableTable[] }>(
      `/meta/bases/${baseId}/tables`
    );
    return {
      success: true,
      tables: result.tables.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        primaryFieldId: t.primaryFieldId,
        fields: t.fields.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
        })),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list tables",
    };
  }
}
