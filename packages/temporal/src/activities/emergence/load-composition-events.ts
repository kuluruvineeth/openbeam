import db, { getCompositionEventsByTeam } from "@openbeam/db";
import type {
  CompositionEvent,
  LoadCompositionEventsInput,
  LoadCompositionEventsOutput,
} from "./types";

export async function loadCompositionEvents(
  input: LoadCompositionEventsInput
): Promise<LoadCompositionEventsOutput> {
  const { teamId, startDate, endDate, limit = 10_000 } = input;

  if (!teamId) {
    return { events: [], totalCount: 0 };
  }

  const dbEvents = await getCompositionEventsByTeam(db, teamId, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    limit,
  });

  const events: CompositionEvent[] = dbEvents.map((e) => ({
    sessionId: e.sessionId,
    teamId: e.teamId,
    userId: e.userId,
    toolSequence: e.toolSequence,
    success: e.success,
    latencyMs: e.latencyMs,
    promptCategory: e.promptCategory ?? "",
    timestamp: e.timestamp.getTime(),
  }));

  return {
    events,
    totalCount: events.length,
  };
}
