import type { PagerDutyClient } from "../client";

interface ServiceListResult {
  success: boolean;
  services?: Array<{ id: string; name: string; description: string }>;
  error?: string;
}

export async function listPagerDutyServices(
  client: PagerDutyClient
): Promise<ServiceListResult> {
  try {
    const data = await client.get<{
      services: Array<{
        id: string;
        name: string;
        description: string | null;
      }>;
    }>("/services", { limit: "100" });

    return {
      success: true,
      services: data.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? "",
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list services",
    };
  }
}
