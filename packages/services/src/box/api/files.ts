import type { BoxClient, BoxEvent, BoxItem } from "../client";

type FolderPage = {
  entries: BoxItem[];
  hasMore: boolean;
};

const PAGE_SIZE = 1000;

export async function* listAllFolderItems(
  client: BoxClient,
  folderId: string,
  recursive: boolean
): AsyncGenerator<FolderPage, void, undefined> {
  const queue: string[] = [folderId];

  while (queue.length > 0) {
    const currentFolderId = queue.shift() as string;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await client.getFolderItems(
        currentFolderId,
        offset,
        PAGE_SIZE
      );

      if (recursive) {
        for (const entry of response.entries) {
          if (entry.type === "folder") {
            queue.push(entry.id);
          }
        }
      }

      yield {
        entries: response.entries,
        hasMore: response.entries.length === PAGE_SIZE || queue.length > 0,
      };

      hasMore = response.entries.length === PAGE_SIZE;
      offset += response.entries.length;
    }
  }
}

type EventsPage = {
  events: BoxEvent[];
  nextStreamPosition: string;
  hasMore: boolean;
};

const EVENTS_PAGE_SIZE = 500;

export async function* listEvents(
  client: BoxClient,
  streamPosition: string
): AsyncGenerator<EventsPage, void, undefined> {
  let currentPosition = streamPosition;
  let hasMore = true;

  while (hasMore) {
    const response = await client.getEvents(currentPosition, EVENTS_PAGE_SIZE);

    const events = response.entries;
    const nextPosition = response.next_stream_position;

    yield {
      events,
      nextStreamPosition: nextPosition,
      hasMore: events.length > 0,
    };

    hasMore = events.length > 0 && nextPosition !== currentPosition;
    currentPosition = nextPosition;
  }
}
