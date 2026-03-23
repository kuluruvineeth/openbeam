import type { Dynamics365Client } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createDynamics365Account(
  client: Dynamics365Client,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ accountid: string }>(
      "/accounts",
      properties
    );
    return {
      success: true,
      recordId: result.accountid,
      url: `${client.orgUrl}/main.aspx?etn=account&id=${result.accountid}&pagetype=entityrecord`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create account",
    };
  }
}

export async function updateDynamics365Account(
  client: Dynamics365Client,
  accountId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch(`/accounts(${accountId})`, properties);
    return {
      success: true,
      recordId: accountId,
      url: `${client.orgUrl}/main.aspx?etn=account&id=${accountId}&pagetype=entityrecord`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update account",
    };
  }
}

export async function createDynamics365Contact(
  client: Dynamics365Client,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ contactid: string }>(
      "/contacts",
      properties
    );
    return {
      success: true,
      recordId: result.contactid,
      url: `${client.orgUrl}/main.aspx?etn=contact&id=${result.contactid}&pagetype=entityrecord`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

export async function updateDynamics365Contact(
  client: Dynamics365Client,
  contactId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch(`/contacts(${contactId})`, properties);
    return {
      success: true,
      recordId: contactId,
      url: `${client.orgUrl}/main.aspx?etn=contact&id=${contactId}&pagetype=entityrecord`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}

export async function createDynamics365Opportunity(
  client: Dynamics365Client,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ opportunityid: string }>(
      "/opportunities",
      properties
    );
    return {
      success: true,
      recordId: result.opportunityid,
      url: `${client.orgUrl}/main.aspx?etn=opportunity&id=${result.opportunityid}&pagetype=entityrecord`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create opportunity",
    };
  }
}

export async function updateDynamics365Opportunity(
  client: Dynamics365Client,
  opportunityId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch(`/opportunities(${opportunityId})`, properties);
    return {
      success: true,
      recordId: opportunityId,
      url: `${client.orgUrl}/main.aspx?etn=opportunity&id=${opportunityId}&pagetype=entityrecord`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update opportunity",
    };
  }
}
