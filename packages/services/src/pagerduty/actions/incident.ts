import type { PagerDutyClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateIncidentParams {
  serviceId: string;
  title: string;
  body?: string;
  urgency?: "high" | "low";
  fromEmail: string;
}

interface UpdateIncidentParams {
  incidentId: string;
  status: "acknowledged" | "resolved";
  fromEmail: string;
}

interface AddNoteParams {
  incidentId: string;
  content: string;
  fromEmail: string;
}

export async function createIncident(
  client: PagerDutyClient,
  params: CreateIncidentParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      incident: { id: string; html_url: string };
    }>(
      "/incidents",
      {
        incident: {
          type: "incident",
          title: params.title,
          service: { id: params.serviceId, type: "service_reference" },
          ...(params.body && {
            body: { type: "incident_body", details: params.body },
          }),
          ...(params.urgency && { urgency: params.urgency }),
        },
      },
      { From: params.fromEmail }
    );

    return {
      success: true,
      id: response.incident.id,
      url: response.incident.html_url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create incident",
    };
  }
}

export async function updateIncidentStatus(
  client: PagerDutyClient,
  params: UpdateIncidentParams
): Promise<ActionResult> {
  try {
    const response = await client.put<{
      incident: { id: string; html_url: string };
    }>(
      `/incidents/${params.incidentId}`,
      {
        incident: {
          type: "incident_reference",
          status: params.status,
        },
      },
      { From: params.fromEmail }
    );

    return {
      success: true,
      id: response.incident.id,
      url: response.incident.html_url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update incident",
    };
  }
}

export async function addIncidentNote(
  client: PagerDutyClient,
  params: AddNoteParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      note: { id: string };
    }>(
      `/incidents/${params.incidentId}/notes`,
      {
        note: {
          content: params.content,
        },
      },
      { From: params.fromEmail }
    );

    return {
      success: true,
      id: response.note.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add note",
    };
  }
}
