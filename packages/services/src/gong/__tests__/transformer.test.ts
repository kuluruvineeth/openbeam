import { describe, expect, it } from "bun:test";
import type { GongTransformContext } from "@openbeam/types/services/connectors/gong";
import type { GenericDocument } from "@openbeam/vespa";
import type { GongCall, GongTranscript } from "../client";
import { transformCall, transformCalls } from "../transformers/call";

const CTX: GongTransformContext = {
  connectorId: "conn_gong_1",
  connectorType: "GONG",
  teamId: "team_1",
  workspaceId: "ws_1",
  syncTranscripts: true,
};

function makeCall(overrides: Partial<GongCall> = {}): GongCall {
  return {
    id: "call_123",
    title: "Demo Call with Acme",
    started: "2026-03-20T14:00:00Z",
    duration: 1800,
    direction: "Outbound",
    scope: "External",
    media: "Video",
    language: "en",
    url: "https://app.gong.io/call?id=call_123",
    parties: [
      {
        id: "p1",
        name: "Alice Smith",
        emailAddress: "alice@company.com",
        affiliation: "Internal",
        title: "Account Executive",
      },
      {
        id: "p2",
        name: "Bob Jones",
        emailAddress: "bob@acme.com",
        affiliation: "External",
        title: "CTO",
      },
    ],
    purpose: "Demo",
    disposition: "Interested",
    ...overrides,
  };
}

function makeTranscript(callId: string): GongTranscript {
  return {
    callId,
    transcript: [
      {
        speakerId: "s1",
        sentences: [
          { start: 0, end: 5, text: "Welcome to the demo." },
          { start: 5, end: 10, text: "Let me show you our platform." },
        ],
      },
      {
        speakerId: "s2",
        sentences: [
          {
            start: 10,
            end: 15,
            text: "Great, I have been looking forward to this.",
          },
        ],
      },
    ],
  };
}

describe("transformCall", () => {
  it("produces a valid GenericDocument from a call", async () => {
    const call = makeCall();
    const doc = await transformCall(call, CTX);

    expect(doc.id).toBe("conn_gong_1_call_call_123");
    expect(doc.connector_id).toBe("conn_gong_1");
    expect(doc.connector_type).toBe("GONG");
    expect(doc.team_id).toBe("team_1");
    expect(doc.document_type).toBe("call");
    expect(doc.title).toBe("Demo Call with Acme");
    expect(doc.url).toBe("https://app.gong.io/call?id=call_123");
    expect(doc.source_type).toBe("gong");
    expect(doc.is_public).toBe(false);
    expect(doc.checksum).toBeDefined();
    expect(doc.content).toContain("Duration: 30m 0s");
    expect(doc.content).toContain("Direction: Outbound");
    expect(doc.content).toContain("Alice Smith");
    expect(doc.content).toContain("Bob Jones");
  });

  it("includes transcript content when provided", async () => {
    const call = makeCall();
    const transcript = makeTranscript(call.id);
    const doc = await transformCall(call, CTX, transcript);

    expect(doc.document_type).toBe("transcript");
    expect(doc.content).toContain("Transcript:");
    expect(doc.content).toContain("Welcome to the demo.");
    expect(doc.content).toContain("Let me show you our platform.");
    expect(doc.content).toContain(
      "Great, I have been looking forward to this."
    );
  });

  it("handles calls with no title", async () => {
    const call = makeCall({ title: "" });
    const doc = await transformCall(call, CTX);

    expect(doc.title).toContain("Call on");
  });

  it("handles calls with no parties", async () => {
    const call = makeCall({ parties: [] });
    const doc = await transformCall(call, CTX);

    expect(doc.content).not.toContain("Participants:");
    const meta = doc.metadata as Record<string, unknown>;
    expect(meta.participantCount).toBe(0);
  });

  it("sets metadata fields correctly", async () => {
    const call = makeCall();
    const doc = await transformCall(call, CTX);
    const meta = doc.metadata as Record<string, unknown>;

    expect(meta.gongCallId).toBe("call_123");
    expect(meta.direction).toBe("Outbound");
    expect(meta.durationSeconds).toBe(1800);
    expect(meta.participantCount).toBe(2);
    expect(meta.purpose).toBe("Demo");
    expect(meta.disposition).toBe("Interested");
  });

  it("formats long durations correctly", async () => {
    const call = makeCall({ duration: 3661 });
    const doc = await transformCall(call, CTX);

    expect(doc.content).toContain("Duration: 1h 1m");
  });
});

describe("transformCalls", () => {
  it("transforms multiple calls", async () => {
    const calls = [
      makeCall({ id: "c1", title: "Call 1" }),
      makeCall({ id: "c2", title: "Call 2" }),
    ];

    const docs = await transformCalls(calls, CTX);
    expect(docs).toHaveLength(2);
    expect(docs[0]).toBeDefined();
    expect(docs[1]).toBeDefined();
    expect((docs[0] as GenericDocument).title).toBe("Call 1");
    expect((docs[1] as GenericDocument).title).toBe("Call 2");
  });

  it("joins transcripts to matching calls", async () => {
    const calls = [
      makeCall({ id: "c1", title: "Call 1" }),
      makeCall({ id: "c2", title: "Call 2" }),
    ];
    const transcriptMap = new Map([["c1", makeTranscript("c1")]]);

    const docs = await transformCalls(calls, CTX, transcriptMap);
    expect(docs).toHaveLength(2);
    expect((docs[0] as GenericDocument).document_type).toBe("transcript");
    expect((docs[1] as GenericDocument).document_type).toBe("call");
  });
});
