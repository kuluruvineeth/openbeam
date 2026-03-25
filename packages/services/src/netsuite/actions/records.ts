import type { NetsuiteClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

function buildRecordUrl(
  accountId: string,
  recordType: string,
  id: string
): string {
  const slug = accountId.toLowerCase().replace(/_/g, "-");
  return `https://${slug}.app.netsuite.com/app/common/entity/entity.nl?id=${id}&type=${recordType}`;
}

export async function createNetsuiteCustomer(
  client: NetsuiteClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: string }>("/customer", properties);
    return {
      success: true,
      recordId: result.id,
      url: buildRecordUrl(client.accountId, "custjob", result.id),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create customer",
    };
  }
}

export async function updateNetsuiteCustomer(
  client: NetsuiteClient,
  customerId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch<{ id: string }>(`/customer/${customerId}`, properties);
    return {
      success: true,
      recordId: customerId,
      url: buildRecordUrl(client.accountId, "custjob", customerId),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update customer",
    };
  }
}

export async function createNetsuiteVendor(
  client: NetsuiteClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: string }>("/vendor", properties);
    return {
      success: true,
      recordId: result.id,
      url: buildRecordUrl(client.accountId, "vendor", result.id),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vendor",
    };
  }
}

export async function createNetsuiteSalesOrder(
  client: NetsuiteClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: string }>("/salesOrder", properties);
    return {
      success: true,
      recordId: result.id,
      url: buildRecordUrl(client.accountId, "salesord", result.id),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create sales order",
    };
  }
}

export async function updateNetsuiteSalesOrder(
  client: NetsuiteClient,
  orderId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch<{ id: string }>(`/salesOrder/${orderId}`, properties);
    return {
      success: true,
      recordId: orderId,
      url: buildRecordUrl(client.accountId, "salesord", orderId),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update sales order",
    };
  }
}
