import type { LinearClient } from "../client";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CycleResult extends ActionResult {
  cycle?: {
    id: string;
    name: string;
    number: number;
    startsAt: string;
    endsAt: string;
    completedAt?: string;
  };
}

export async function getCycle(
  client: LinearClient,
  cycleId: string
): Promise<CycleResult> {
  try {
    const data = await client.query<{
      cycle: {
        id: string;
        name: string;
        number: number;
        startsAt: string;
        endsAt: string;
        completedAt: string;
      };
    }>(
      `query($id: String!) {
        cycle(id: $id) { id name number startsAt endsAt completedAt }
      }`,
      { id: cycleId }
    );

    return { success: true, cycle: data.cycle };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get cycle",
    };
  }
}

export async function addIssueToCycle(
  client: LinearClient,
  issueId: string,
  cycleId: string
): Promise<ActionResult> {
  try {
    const data = await client.mutation<{
      issueUpdate: { success: boolean };
    }>(
      `mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) { success }
      }`,
      { id: issueId, input: { cycleId } }
    );

    return { success: data.issueUpdate.success };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add issue to cycle",
    };
  }
}
