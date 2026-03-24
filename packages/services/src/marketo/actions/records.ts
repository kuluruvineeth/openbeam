import type { MarketoClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

type MarketoLeadInput = {
  id?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  phone?: string;
  [key: string]: unknown;
};

type MarketoLeadResponse = {
  id: number;
  status: string;
  reasons?: Array<{ code: string; message: string }>;
};

export async function createOrUpdateMarketoLead(
  client: MarketoClient,
  properties: MarketoLeadInput
): Promise<RecordActionResult> {
  try {
    const response = await client.postApi<MarketoLeadResponse>(
      "/v1/leads.json",
      {
        action: "createOrUpdate",
        lookupField: properties.id ? "id" : "email",
        input: [properties],
      }
    );

    const result = response.result?.[0];
    if (!result || result.status === "skipped") {
      const reason = result?.reasons?.[0]?.message ?? "Unknown error";
      return { success: false, error: reason };
    }

    return {
      success: true,
      recordId: String(result.id),
      url: `https://app-${client.munchkinId}.marketo.com/#LE${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create/update lead",
    };
  }
}

export async function triggerMarketoCampaign(
  client: MarketoClient,
  campaignId: number,
  leadIds: number[],
  tokens?: Array<{ name: string; value: string }>
): Promise<RecordActionResult> {
  try {
    const body: Record<string, unknown> = {
      input: { leads: leadIds.map((id) => ({ id })) },
    };
    if (tokens?.length) {
      body.input = {
        ...(body.input as object),
        tokens,
      };
    }

    await client.postApi(`/v1/campaigns/${campaignId}/trigger.json`, body);

    return {
      success: true,
      recordId: String(campaignId),
      url: `https://app-${client.munchkinId}.marketo.com/#SC${campaignId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to trigger campaign",
    };
  }
}
