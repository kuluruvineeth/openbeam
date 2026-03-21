import type { SalesforceClient } from "../client";

type CreateRecordResponse = {
  id: string;
  success: boolean;
  errors: string[];
};

type DescribeResponse = {
  name: string;
  label: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    createable: boolean;
    updateable: boolean;
  }>;
};

export function createRecord(
  client: SalesforceClient,
  sobject: string,
  fields: Record<string, unknown>
): Promise<CreateRecordResponse> {
  return client.post<CreateRecordResponse>(`/sobjects/${sobject}`, fields);
}

export function updateRecord(
  client: SalesforceClient,
  sobject: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  return client.patch(`/sobjects/${sobject}/${recordId}`, fields);
}

export function describeSObject(
  client: SalesforceClient,
  sobject: string
): Promise<DescribeResponse> {
  return client.get<DescribeResponse>(`/sobjects/${sobject}/describe`);
}
