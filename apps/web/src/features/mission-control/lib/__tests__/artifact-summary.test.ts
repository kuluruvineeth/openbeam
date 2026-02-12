import { describe, expect, it } from "bun:test";
import { createMockEvent } from "../../__tests__/test-helpers";
import {
  mapArtifactRunsToSummaries,
  mapMissionEventsToArtifactSummaries,
} from "../artifact-summary";

describe("mapArtifactRunsToSummaries", () => {
  it("normalizes run artifacts for UI display", () => {
    const summaries = mapArtifactRunsToSummaries([
      {
        runId: "run-1",
        agentName: "Researcher",
        createdAt: new Date("2026-02-12T10:00:00.000Z"),
        artifacts: [
          {
            id: "artifact-1",
            type: "text",
            status: "final",
            content: "Mission result\nmore detail",
          },
        ],
      },
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      artifactId: "artifact-1",
      type: "document",
      status: "completed",
      title: "Mission result",
      agentName: "Researcher",
    });
  });
});

describe("mapMissionEventsToArtifactSummaries", () => {
  it("maps artifact.published events to artifact summaries", () => {
    const summaries = mapMissionEventsToArtifactSummaries([
      createMockEvent({
        eventId: "evt-1",
        eventType: "artifact.published",
        timestamp: 2000,
        agentName: "Analyst",
        payload: {
          artifactId: "artifact-evt-1",
          artifactTitle: "**Competitive** snapshot",
          artifactType: "report",
          content: "Snapshot content",
        },
      }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      artifactId: "artifact-evt-1",
      title: "Competitive snapshot",
      type: "report",
      agentName: "Analyst",
    });
  });

  it("falls back to latest agent_step_completed content when artifacts are absent", () => {
    const summaries = mapMissionEventsToArtifactSummaries([
      createMockEvent({
        eventId: "step-old",
        eventType: "agent_step_completed",
        timestamp: 1000,
        agentName: "Researcher",
        payload: { agentId: "a-1", content: "Older output" },
      }),
      createMockEvent({
        eventId: "step-new",
        eventType: "agent_step_completed",
        timestamp: 2000,
        agentName: "Researcher",
        payload: { agentId: "a-1", content: "Latest output" },
      }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      title: "Latest output",
      type: "document",
      agentName: "Researcher",
    });
  });

  it("falls back to mission completion summary when no step output exists", () => {
    const summaries = mapMissionEventsToArtifactSummaries([
      createMockEvent({
        eventId: "mission-complete",
        eventType: "mission.completed",
        summary: "Mission orchestrator completed. Dispatched: 4, Completed: 4",
        timestamp: 3000,
      }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      title: "Mission orchestrator completed. Dispatched: 4, Completed: 4",
      type: "document",
      status: "completed",
    });
  });
});
