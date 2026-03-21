import {
  createRecord as apiCreateRecord,
  updateRecord as apiUpdateRecord,
} from "../api/records";
import type { SalesforceClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createSalesforceRecord(
  client: SalesforceClient,
  sobject: string,
  fields: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await apiCreateRecord(client, sobject, fields);

    if (!result.success) {
      return {
        success: false,
        error: result.errors.join("; ") || "Create failed",
      };
    }

    return {
      success: true,
      recordId: result.id,
      url: `${client.instanceUrl}/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create record",
    };
  }
}

export async function updateSalesforceRecord(
  client: SalesforceClient,
  sobject: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await apiUpdateRecord(client, sobject, recordId, fields);
    return {
      success: true,
      recordId,
      url: `${client.instanceUrl}/${recordId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update record",
    };
  }
}
