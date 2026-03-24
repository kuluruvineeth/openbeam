import type { CoupaClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createCoupaRequisition(
  client: CoupaClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      "/requisitions",
      properties
    );
    return {
      success: true,
      recordId: String(result.id),
      url: `${client.instanceUrl}/requisitions/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create requisition",
    };
  }
}

export async function updateCoupaRequisition(
  client: CoupaClient,
  requisitionId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.put<{ id: number }>(
      `/requisitions/${requisitionId}`,
      properties
    );
    return {
      success: true,
      recordId: requisitionId,
      url: `${client.instanceUrl}/requisitions/${requisitionId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update requisition",
    };
  }
}

export async function createCoupaSupplier(
  client: CoupaClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: number }>("/suppliers", properties);
    return {
      success: true,
      recordId: String(result.id),
      url: `${client.instanceUrl}/suppliers/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create supplier",
    };
  }
}

export async function createCoupaExpenseReport(
  client: CoupaClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      "/expense_reports",
      properties
    );
    return {
      success: true,
      recordId: String(result.id),
      url: `${client.instanceUrl}/expense_reports/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create expense report",
    };
  }
}
