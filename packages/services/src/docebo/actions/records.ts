import type { DoceboClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createDoceboEnrollment(
  client: DoceboClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ data: { enrollment_id: number } }>(
      "/learn/v1/enrollment",
      properties
    );
    return {
      success: true,
      recordId: String(result.data.enrollment_id),
      url: `${client.instanceUrl}/enrollment`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create enrollment",
    };
  }
}

export async function updateDoceboCourse(
  client: DoceboClient,
  courseId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.put<{ data: { id: number } }>(
      `/learn/v1/courses/${courseId}`,
      properties
    );
    return {
      success: true,
      recordId: courseId,
      url: `${client.instanceUrl}/course/${courseId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update course",
    };
  }
}
