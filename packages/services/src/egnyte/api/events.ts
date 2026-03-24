import type { EgnyteClient, EgnyteEvent } from "../client";

type EventsPage = {
  events: EgnyteEvent[];
  latestEventId: number;
  hasMore: boolean;
};

const EVENTS_PAGE_SIZE = 100;

export async function* listEvents(
  client: EgnyteClient,
  startEventId: string
): AsyncGenerator<EventsPage, void, undefined> {
  let currentId = startEventId;
  let hasMore = true;

  while (hasMore) {
    const response = await client.getEvents(currentId, EVENTS_PAGE_SIZE);

    const events = response.events;
    const latestId = response.latest_event_id;

    yield {
      events,
      latestEventId: latestId,
      hasMore: events.length > 0,
    };

    hasMore = events.length > 0 && latestId > Number(currentId);
    currentId = String(latestId);
  }
}
