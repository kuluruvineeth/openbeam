import type { ServiceNowClient } from "../client";
import type { ServiceNowChangeRequest } from "../transformers/change-request";
import type { ServiceNowIncident } from "../transformers/incident";
import type { ServiceNowKnowledgeArticle } from "../transformers/knowledge";

const INCIDENT_FIELDS = [
  "sys_id",
  "number",
  "short_description",
  "description",
  "state",
  "priority",
  "urgency",
  "impact",
  "assigned_to",
  "caller_id",
  "category",
  "subcategory",
  "sys_created_on",
  "sys_updated_on",
].join(",");

const KNOWLEDGE_FIELDS = [
  "sys_id",
  "number",
  "short_description",
  "text",
  "workflow_state",
  "author",
  "kb_category",
  "sys_created_on",
  "sys_updated_on",
].join(",");

const CHANGE_REQUEST_FIELDS = [
  "sys_id",
  "number",
  "short_description",
  "description",
  "state",
  "priority",
  "assigned_to",
  "type",
  "risk",
  "sys_created_on",
  "sys_updated_on",
].join(",");

export async function* getAllIncidents(
  client: ServiceNowClient
): AsyncGenerator<ServiceNowIncident[], void, undefined> {
  for await (const page of client.paginateTable<ServiceNowIncident>(
    "incident",
    {
      sysparm_fields: INCIDENT_FIELDS,
      sysparm_query: "ORDERBYsys_updated_on",
      sysparm_limit: "100",
    }
  )) {
    yield page;
  }
}

export async function* getIncidentsUpdatedAfter(
  client: ServiceNowClient,
  updatedAfter: string
): AsyncGenerator<ServiceNowIncident[], void, undefined> {
  for await (const page of client.paginateTable<ServiceNowIncident>(
    "incident",
    {
      sysparm_fields: INCIDENT_FIELDS,
      sysparm_query: `sys_updated_on>${updatedAfter}^ORDERBYsys_updated_on`,
      sysparm_limit: "100",
    }
  )) {
    yield page;
  }
}

export async function* getAllKnowledgeArticles(
  client: ServiceNowClient
): AsyncGenerator<ServiceNowKnowledgeArticle[], void, undefined> {
  for await (const page of client.paginateTable<ServiceNowKnowledgeArticle>(
    "kb_knowledge",
    {
      sysparm_fields: KNOWLEDGE_FIELDS,
      sysparm_query: "ORDERBYsys_updated_on",
      sysparm_limit: "100",
    }
  )) {
    yield page;
  }
}

export async function* getKnowledgeArticlesUpdatedAfter(
  client: ServiceNowClient,
  updatedAfter: string
): AsyncGenerator<ServiceNowKnowledgeArticle[], void, undefined> {
  for await (const page of client.paginateTable<ServiceNowKnowledgeArticle>(
    "kb_knowledge",
    {
      sysparm_fields: KNOWLEDGE_FIELDS,
      sysparm_query: `sys_updated_on>${updatedAfter}^ORDERBYsys_updated_on`,
      sysparm_limit: "100",
    }
  )) {
    yield page;
  }
}

export async function* getAllChangeRequests(
  client: ServiceNowClient
): AsyncGenerator<ServiceNowChangeRequest[], void, undefined> {
  for await (const page of client.paginateTable<ServiceNowChangeRequest>(
    "change_request",
    {
      sysparm_fields: CHANGE_REQUEST_FIELDS,
      sysparm_query: "ORDERBYsys_updated_on",
      sysparm_limit: "100",
    }
  )) {
    yield page;
  }
}

export async function* getChangeRequestsUpdatedAfter(
  client: ServiceNowClient,
  updatedAfter: string
): AsyncGenerator<ServiceNowChangeRequest[], void, undefined> {
  for await (const page of client.paginateTable<ServiceNowChangeRequest>(
    "change_request",
    {
      sysparm_fields: CHANGE_REQUEST_FIELDS,
      sysparm_query: `sys_updated_on>${updatedAfter}^ORDERBYsys_updated_on`,
      sysparm_limit: "100",
    }
  )) {
    yield page;
  }
}

type CreateIncidentResponse = {
  result: { sys_id: string; number: string };
};

export function createIncident(
  client: ServiceNowClient,
  fields: Record<string, unknown>
): Promise<CreateIncidentResponse> {
  return client.post<CreateIncidentResponse>("/table/incident", fields);
}

export function updateIncident(
  client: ServiceNowClient,
  sysId: string,
  fields: Record<string, unknown>
): Promise<void> {
  return client.patch(`/table/incident/${sysId}`, fields) as Promise<void>;
}

export function addIncidentComment(
  client: ServiceNowClient,
  sysId: string,
  comment: string,
  isWorkNote = false
): Promise<void> {
  const field = isWorkNote ? "work_notes" : "comments";
  return client.patch(`/table/incident/${sysId}`, {
    [field]: comment,
  }) as Promise<void>;
}
