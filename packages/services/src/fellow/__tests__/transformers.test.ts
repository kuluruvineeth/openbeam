import { describe, expect, it } from "bun:test";
import type { FellowTransformContext } from "@openbeam/types/services/connectors/fellow";
import { transformActionItem } from "../transformers/action-item";
import { transformMeeting } from "../transformers/meeting";
import { transformStream } from "../transformers/stream";

const CONTEXT: FellowTransformContext = {
  connectorId: "conn_fellow_1",
  connectorType: "FELLOW",
  teamId: "team_1",
  workspaceId: "ws_1",
};

describe("transformMeeting", () => {
  it("transforms a meeting with notes and attendees", async () => {
    const meeting = {
      id: "mtg-1",
      title: "Weekly Standup",
      start_time: "2024-01-15T09:00:00Z",
      end_time: "2024-01-15T09:30:00Z",
      attendees: [
        { email: "alice@test.com", name: "Alice" },
        { email: "bob@test.com", name: "Bob" },
      ],
      notes: [
        {
          id: "note-1",
          body: "<p>Discussed Q1 goals</p>",
          created_at: "2024-01-15T09:05:00Z",
          updated_at: "2024-01-15T09:25:00Z",
        },
      ],
      url: "https://fellow.app/meetings/mtg-1",
      created_at: "2024-01-15T08:00:00Z",
      updated_at: "2024-01-15T09:30:00Z",
    };

    const doc = await transformMeeting(meeting, CONTEXT);

    expect(doc.id).toBe("conn_fellow_1_meeting_mtg-1");
    expect(doc.document_type).toBe("meeting");
    expect(doc.title).toBe("Weekly Standup");
    expect(doc.content).toContain("Discussed Q1 goals");
    expect(doc.content).toContain("Attendees: Alice, Bob");
    expect(doc.content).toContain("Duration: 30 minutes");
    expect(doc.metadata?.attendeeCount).toBe("2");
    expect(doc.metadata?.noteCount).toBe("1");
    expect(doc.source_type).toBe("fellow");
    expect(doc.url).toBe("https://fellow.app/meetings/mtg-1");
    expect(doc.author_name).toBe("Alice");
  });

  it("transforms a meeting without notes", async () => {
    const meeting = {
      id: "mtg-2",
      title: "Quick Chat",
      start_time: "2024-01-16T14:00:00Z",
      end_time: "2024-01-16T14:15:00Z",
      attendees: [{ email: "carol@test.com" }],
      notes: [],
      url: "https://fellow.app/meetings/mtg-2",
      created_at: "2024-01-16T13:00:00Z",
      updated_at: "2024-01-16T14:15:00Z",
    };

    const doc = await transformMeeting(meeting, CONTEXT);

    expect(doc.document_subtype).toBe("no_notes");
    expect(doc.content).toContain("carol@test.com");
    expect(doc.content).toContain("Duration: 15 minutes");
  });
});

describe("transformActionItem", () => {
  it("transforms an open action item", async () => {
    const item = {
      id: "ai-1",
      title: "Review Q1 roadmap",
      description: "Check the product roadmap for Q1",
      assignee: { email: "alice@test.com", name: "Alice" },
      due_date: "2024-02-01",
      completed: false,
      meeting_id: "mtg-1",
      meeting_title: "Weekly Standup",
      url: "https://fellow.app/action-items/ai-1",
      created_at: "2024-01-15T09:00:00Z",
      updated_at: "2024-01-15T09:30:00Z",
    };

    const doc = await transformActionItem(item, CONTEXT);

    expect(doc.id).toBe("conn_fellow_1_action_item_ai-1");
    expect(doc.document_type).toBe("action_item");
    expect(doc.document_subtype).toBe("open");
    expect(doc.title).toBe("Review Q1 roadmap");
    expect(doc.content).toContain("Status: Open");
    expect(doc.content).toContain("Assigned to: Alice");
    expect(doc.content).toContain("Due: 2024-02-01");
    expect(doc.content).toContain("Meeting: Weekly Standup");
    expect(doc.metadata?.completed).toBe(false);
    expect(doc.metadata?.assignee).toBe("Alice");
    expect(doc.metadata?.meetingTitle).toBe("Weekly Standup");
  });

  it("transforms a completed action item", async () => {
    const item = {
      id: "ai-2",
      title: "Send report",
      completed: true,
      completed_at: "2024-01-20T12:00:00Z",
      url: "https://fellow.app/action-items/ai-2",
      created_at: "2024-01-15T09:00:00Z",
      updated_at: "2024-01-20T12:00:00Z",
    };

    const doc = await transformActionItem(item, CONTEXT);

    expect(doc.document_subtype).toBe("completed");
    expect(doc.content).toContain("Status: Completed");
    expect(doc.metadata?.completed).toBe(true);
  });
});

describe("transformStream", () => {
  it("transforms a stream", async () => {
    const stream = {
      id: "stream-1",
      name: "Engineering Weekly",
      description: "Notes from weekly engineering meetings",
      url: "https://fellow.app/streams/stream-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    };

    const doc = await transformStream(stream, CONTEXT);

    expect(doc.id).toBe("conn_fellow_1_stream_stream-1");
    expect(doc.document_type).toBe("stream");
    expect(doc.title).toBe("Engineering Weekly");
    expect(doc.content).toContain("Notes from weekly engineering meetings");
    expect(doc.source_type).toBe("fellow");
  });

  it("transforms a stream without description", async () => {
    const stream = {
      id: "stream-2",
      name: "Design Sync",
      url: "https://fellow.app/streams/stream-2",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    };

    const doc = await transformStream(stream, CONTEXT);

    expect(doc.title).toBe("Design Sync");
    expect(doc.content).toBe("");
  });
});
