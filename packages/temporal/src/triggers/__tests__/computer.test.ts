import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStart = vi.fn();
const mockSignal = vi.fn();
const mockGetHandle = vi.fn();

vi.mock("../../client", () => ({
  getTemporalClient: () =>
    Promise.resolve({
      workflow: {
        start: (...args: unknown[]) => mockStart(...args),
        getHandle: (...args: unknown[]) => mockGetHandle(...args),
      },
    }),
}));

import {
  signalComputerApproval,
  signalComputerRejection,
  startComputerRun,
} from "../computer";

describe("startComputerRun", () => {
  beforeEach(() => {
    mockStart.mockReset();
    mockSignal.mockReset();
    mockGetHandle.mockReset();
  });

  it("uses deterministic workflow ID computer:{runId}", async () => {
    mockStart.mockResolvedValue({ workflowId: "computer:run_abc" });

    await startComputerRun({
      agentId: "agent_1",
      teamId: "team_a",
      runId: "run_abc",
      agentName: "Digest",
      triggerType: "MANUAL",
    });

    const [name, options] = mockStart.mock.calls[0] ?? [];
    expect(name).toBe("agentRunWorkflow");
    expect(options.workflowId).toBe("computer:run_abc");
  });

  it("sends workflow to the computer task queue", async () => {
    mockStart.mockResolvedValue({ workflowId: "computer:run_1" });

    await startComputerRun({
      agentId: "agent_1",
      teamId: "team_a",
      runId: "run_1",
      agentName: "Agent",
      triggerType: "SCHEDULE",
    });

    const [, options] = mockStart.mock.calls[0] ?? [];
    expect(options.taskQueue).toBe("computer");
  });

  it("builds AgentRunInput with defaults", async () => {
    mockStart.mockResolvedValue({ workflowId: "computer:run_1" });

    await startComputerRun({
      agentId: "agent_1",
      teamId: "team_a",
      runId: "run_1",
      agentName: "Weekly Digest",
      triggerType: "SCHEDULE",
      triggeredByUser: "user_1",
      parameters: { role: "engineer" },
      approvalTimeoutMs: 60_000,
    });

    const [, options] = mockStart.mock.calls[0] ?? [];
    const input = options.args[0];
    expect(input).toEqual({
      agentId: "agent_1",
      teamId: "team_a",
      triggerType: "SCHEDULE",
      triggeredByUser: "user_1",
      parameters: { role: "engineer" },
      notifyChannels: [],
      memoryEnabled: true,
      agentName: "Weekly Digest",
      approvalTimeoutMs: 60_000,
    });
  });

  it("attaches memo for workflow history browsing", async () => {
    mockStart.mockResolvedValue({ workflowId: "computer:run_1" });

    await startComputerRun({
      agentId: "agent_xyz",
      teamId: "team_a",
      runId: "run_1",
      agentName: "Compliance Watchdog",
      triggerType: "SCHEDULE",
    });

    const [, options] = mockStart.mock.calls[0] ?? [];
    expect(options.memo).toEqual({
      agentId: "agent_xyz",
      agentName: "Compliance Watchdog",
      triggerType: "SCHEDULE",
    });
  });

  it("treats WorkflowExecutionAlreadyStartedError as a successful idempotent start", async () => {
    mockStart.mockRejectedValue(
      new WorkflowExecutionAlreadyStartedError(
        "already running",
        "computer:run_dup",
        "agentRunWorkflow"
      )
    );

    const handle = await startComputerRun({
      agentId: "agent_1",
      teamId: "team_a",
      runId: "run_dup",
      agentName: "X",
      triggerType: "MANUAL",
    });

    expect(handle).toEqual({
      workflowId: "computer:run_dup",
      runId: "run_dup",
    });
  });

  it("rethrows other errors", async () => {
    mockStart.mockRejectedValue(new Error("temporal unreachable"));

    await expect(
      startComputerRun({
        agentId: "agent_1",
        teamId: "team_a",
        runId: "run_1",
        agentName: "X",
        triggerType: "MANUAL",
      })
    ).rejects.toThrow("temporal unreachable");
  });

  it("returns handle with runId preserved", async () => {
    mockStart.mockResolvedValue({ workflowId: "computer:run_7" });

    const handle = await startComputerRun({
      agentId: "agent_1",
      teamId: "team_a",
      runId: "run_7",
      agentName: "X",
      triggerType: "API",
    });

    expect(handle.runId).toBe("run_7");
    expect(handle.workflowId).toBe("computer:run_7");
  });
});

describe("signalComputerApproval", () => {
  beforeEach(() => {
    mockStart.mockReset();
    mockSignal.mockReset();
    mockGetHandle.mockReset().mockReturnValue({ signal: mockSignal });
  });

  it("targets the workflow by runId", async () => {
    mockSignal.mockResolvedValue(undefined);

    await signalComputerApproval("run_1", [], "user_reviewer");

    expect(mockGetHandle).toHaveBeenCalledWith("computer:run_1");
  });

  it("sends approvedActions and reviewedBy in the payload", async () => {
    mockSignal.mockResolvedValue(undefined);

    const actions = [
      { tool: "archive", args: { uri: "doc_1" }, description: "Archive 1" },
    ];

    await signalComputerApproval("run_1", actions, "alice");

    const [, payload] = mockSignal.mock.calls[0] ?? [];
    expect(payload).toEqual({
      approvedActions: actions,
      reviewedBy: "alice",
    });
  });

  it("works with empty action list (reject-all-but-approve-the-run pattern)", async () => {
    mockSignal.mockResolvedValue(undefined);

    await signalComputerApproval("run_1", [], "alice");

    const [, payload] = mockSignal.mock.calls[0] ?? [];
    expect(payload.approvedActions).toEqual([]);
  });
});

describe("signalComputerRejection", () => {
  beforeEach(() => {
    mockSignal.mockReset();
    mockGetHandle.mockReset().mockReturnValue({ signal: mockSignal });
  });

  it("targets the workflow by runId", async () => {
    mockSignal.mockResolvedValue(undefined);

    await signalComputerRejection("run_1", "user_reviewer");

    expect(mockGetHandle).toHaveBeenCalledWith("computer:run_1");
  });

  it("sends reviewedBy without note by default", async () => {
    mockSignal.mockResolvedValue(undefined);

    await signalComputerRejection("run_1", "bob");

    const [, payload] = mockSignal.mock.calls[0] ?? [];
    expect(payload).toEqual({ reviewedBy: "bob", note: undefined });
  });

  it("forwards optional note", async () => {
    mockSignal.mockResolvedValue(undefined);

    await signalComputerRejection("run_1", "bob", "false positive");

    const [, payload] = mockSignal.mock.calls[0] ?? [];
    expect(payload.note).toBe("false positive");
  });
});
