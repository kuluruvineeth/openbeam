import type { OpsGenieClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateAlertParams {
  message: string;
  description?: string;
  priority?: "P1" | "P2" | "P3" | "P4" | "P5";
  tags?: string[];
  responders?: {
    id: string;
    type: "team" | "user" | "escalation" | "schedule";
  }[];
}

interface AcknowledgeAlertParams {
  alertId: string;
  note?: string;
}

interface CloseAlertParams {
  alertId: string;
  note?: string;
}

interface AddAlertNoteParams {
  alertId: string;
  note: string;
}

export async function createAlert(
  client: OpsGenieClient,
  params: CreateAlertParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      result: string;
      took: number;
      requestId: string;
    }>("/alerts", {
      message: params.message,
      ...(params.description && { description: params.description }),
      ...(params.priority && { priority: params.priority }),
      ...(params.tags?.length && { tags: params.tags }),
      ...(params.responders?.length && { responders: params.responders }),
    });

    return {
      success: true,
      id: response.requestId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create alert",
    };
  }
}

export async function acknowledgeAlert(
  client: OpsGenieClient,
  params: AcknowledgeAlertParams
): Promise<ActionResult> {
  try {
    await client.post(`/alerts/${params.alertId}/acknowledge`, {
      ...(params.note && { note: params.note }),
    });

    return { success: true, id: params.alertId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to acknowledge alert",
    };
  }
}

export async function closeAlert(
  client: OpsGenieClient,
  params: CloseAlertParams
): Promise<ActionResult> {
  try {
    await client.post(`/alerts/${params.alertId}/close`, {
      ...(params.note && { note: params.note }),
    });

    return { success: true, id: params.alertId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to close alert",
    };
  }
}

export async function addAlertNote(
  client: OpsGenieClient,
  params: AddAlertNoteParams
): Promise<ActionResult> {
  try {
    await client.post(`/alerts/${params.alertId}/notes`, {
      note: params.note,
    });

    return { success: true, id: params.alertId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add note",
    };
  }
}
