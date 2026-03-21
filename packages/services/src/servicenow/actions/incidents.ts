import {
  addIncidentComment as apiAddComment,
  createIncident as apiCreateIncident,
  updateIncident as apiUpdateIncident,
} from "../api/tables";
import type { ServiceNowClient } from "../client";

export interface IncidentActionResult {
  success: boolean;
  sysId?: string;
  number?: string;
  url?: string;
  error?: string;
}

export async function createServiceNowIncident(
  client: ServiceNowClient,
  params: {
    short_description: string;
    description?: string;
    priority?: string;
    urgency?: string;
    category?: string;
  }
): Promise<IncidentActionResult> {
  try {
    const result = await apiCreateIncident(client, params);
    return {
      success: true,
      sysId: result.result.sys_id,
      number: result.result.number,
      url: `https://${client.instance}.service-now.com/nav_to.do?uri=incident.do?sys_id=${result.result.sys_id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create incident",
    };
  }
}

export async function updateServiceNowIncident(
  client: ServiceNowClient,
  sysId: string,
  fields: Record<string, unknown>
): Promise<IncidentActionResult> {
  try {
    await apiUpdateIncident(client, sysId, fields);
    return {
      success: true,
      sysId,
      url: `https://${client.instance}.service-now.com/nav_to.do?uri=incident.do?sys_id=${sysId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update incident",
    };
  }
}

export async function addServiceNowComment(
  client: ServiceNowClient,
  sysId: string,
  comment: string,
  isWorkNote = false
): Promise<IncidentActionResult> {
  try {
    await apiAddComment(client, sysId, comment, isWorkNote);
    return {
      success: true,
      sysId,
      url: `https://${client.instance}.service-now.com/nav_to.do?uri=incident.do?sys_id=${sysId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
