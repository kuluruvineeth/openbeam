import { describe, expect, it } from "bun:test";
import { selectActiveMissionRunIdForAgent } from "../mission-control.utils";

describe("selectActiveMissionRunIdForAgent", () => {
  it("returns matching run id for the selected agent", () => {
    const runId = selectActiveMissionRunIdForAgent(
      [
        { id: "run-1", agentId: "agent-a" },
        { id: "run-2", agentId: "agent-b" },
      ],
      "agent-b"
    );

    expect(runId).toBe("run-2");
  });

  it("returns null when the selected agent has no active run", () => {
    const runId = selectActiveMissionRunIdForAgent(
      [{ id: "run-1", agentId: "agent-a" }],
      "agent-z"
    );

    expect(runId).toBeNull();
  });
});
