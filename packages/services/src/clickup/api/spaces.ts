import type { ClickUpSpace } from "@openbeam/types/services/connectors/clickup";
import type { ClickUpClient } from "../client";

interface SpacesResponse {
  spaces: ClickUpSpace[];
}

export async function* getAllSpaces(
  client: ClickUpClient,
  workspaceId: string
): AsyncGenerator<ClickUpSpace> {
  const response = await client.get<SpacesResponse>(
    `/team/${workspaceId}/space`,
    { archived: "false" }
  );

  for (const space of response.spaces) {
    yield space;
  }
}
