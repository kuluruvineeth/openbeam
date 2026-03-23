import type { OpsGenieClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateIncidentParams {
  message: string;
  description?: string;
  priority: "P1" | "P2" | "P3" | "P4" | "P5";
  tags?: string[];
  serviceId?: string;
  responders?: { id: string; type: "team" | "user" }[];
}

interface ResolveIncidentParams {
  incidentId: string;
  note?: string;
}

export async function createIncident(
  client: OpsGenieClient,
  params: CreateIncidentParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      result: string;
      took: number;
      requestId: string;
    }>("/incidents/create", {
      message: params.message,
      priority: params.priority,
      ...(params.description && { description: params.description }),
      ...(params.tags?.length && { tags: params.tags }),
      ...(params.serviceId && {
        impactedServices: [params.serviceId],
      }),
      ...(params.responders?.length && { responders: params.responders }),
    });

    return {
      success: true,
      id: response.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create incident",
    };
  }
}

export async function resolveIncident(
  client: OpsGenieClient,
  params: ResolveIncidentParams
): Promise<ActionResult> {
  try {
    await client.post(`/incidents/${params.incidentId}/resolve`, {
      ...(params.note && { note: params.note }),
    });

    return { success: true, id: params.incidentId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resolve incident",
    };
  }
}
