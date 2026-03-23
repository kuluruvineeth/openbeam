import type { DatadogClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateMonitorParams {
  name: string;
  type: string;
  query: string;
  message?: string;
  tags?: string[];
  priority?: number;
}

interface UpdateMonitorParams {
  monitorId: number;
  name?: string;
  query?: string;
  message?: string;
  tags?: string[];
  priority?: number;
}

interface MuteMonitorParams {
  monitorId: number;
  scope?: string;
  end?: number;
}

interface UnmuteMonitorParams {
  monitorId: number;
  scope?: string;
}

export async function createMonitor(
  client: DatadogClient,
  params: CreateMonitorParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{ id: number }>("/api/v1/monitor", {
      name: params.name,
      type: params.type,
      query: params.query,
      ...(params.message && { message: params.message }),
      ...(params.tags?.length && { tags: params.tags }),
      ...(params.priority !== undefined && { priority: params.priority }),
    });

    return {
      success: true,
      id: String(response.id),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create monitor",
    };
  }
}

export async function updateMonitor(
  client: DatadogClient,
  params: UpdateMonitorParams
): Promise<ActionResult> {
  try {
    await client.put(`/api/v1/monitor/${params.monitorId}`, {
      ...(params.name && { name: params.name }),
      ...(params.query && { query: params.query }),
      ...(params.message !== undefined && { message: params.message }),
      ...(params.tags && { tags: params.tags }),
      ...(params.priority !== undefined && { priority: params.priority }),
    });

    return { success: true, id: String(params.monitorId) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update monitor",
    };
  }
}

export async function muteMonitor(
  client: DatadogClient,
  params: MuteMonitorParams
): Promise<ActionResult> {
  try {
    await client.post(`/api/v1/monitor/${params.monitorId}/mute`, {
      ...(params.scope && { scope: params.scope }),
      ...(params.end && { end: params.end }),
    });

    return { success: true, id: String(params.monitorId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mute monitor",
    };
  }
}

export async function unmuteMonitor(
  client: DatadogClient,
  params: UnmuteMonitorParams
): Promise<ActionResult> {
  try {
    await client.post(`/api/v1/monitor/${params.monitorId}/unmute`, {
      ...(params.scope && { scope: params.scope }),
    });

    return { success: true, id: String(params.monitorId) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to unmute monitor",
    };
  }
}
