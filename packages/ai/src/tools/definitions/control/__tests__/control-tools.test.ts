import { describe, expect, it, mock } from "bun:test";

function mockFn(returnValue: any) {
  return mock(() => Promise.resolve(returnValue));
}

function data(result: any) {
  return result.data;
}

function createMockCtx(overrides?: Partial<{ teamId: string }>) {
  return {
    teamId: overrides?.teamId ?? "team-1",
    userId: "user-1",
    accessControl: [],
    memory: null,
    metadata: { agentId: "agent-self" },
    services: {
      controlAgents: {
        list: mockFn([
          { id: "agent-1", name: "Research Agent", status: "ACTIVE" },
        ]),
        get: mockFn({
          id: "agent-1",
          name: "Research Agent",
          status: "ACTIVE",
        }),
        wake: mockFn({
          requestId: "req-1",
          accepted: true,
        }),
      },
      controlIssues: {
        list: mockFn([{ id: "issue-1", title: "Bug", status: "OPEN" }]),
        create: mockFn({
          id: "issue-2",
          title: "New Issue",
        }),
        update: mockFn({
          id: "issue-1",
          status: "RESOLVED",
        }),
        comment: mockFn({
          id: "comment-1",
          body: "test",
        }),
        checkout: mockFn({ success: true }),
      },
      controlApprovals: {
        list: mockFn([{ id: "approval-1", status: "PENDING" }]),
        request: mockFn({
          id: "approval-2",
          status: "PENDING",
        }),
        respond: mockFn({
          id: "approval-1",
          status: "APPROVED",
        }),
      },
      controlCosts: {
        record: mockFn({ id: "cost-1", costCents: 50 }),
        query: mockFn({
          totalCents: 500,
          entries: [],
        }),
      },
      controlGoals: {
        list: mockFn([{ id: "goal-1", name: "Q1 Target" }]),
        get: mockFn({
          id: "goal-1",
          name: "Q1 Target",
          progress: 0.5,
        }),
      },
      controlProjects: {
        list: mockFn([{ id: "proj-1", name: "Alpha" }]),
      },
      controlMemory: {
        read: mockFn("# Progress\nStep 1 complete."),
        write: mockFn(undefined),
      },
      controlKnowledge: {
        query: mockFn({
          content: "# Conventions\nUse strict TypeScript.",
          files: ["conventions.md", "decisions/001-auth.md"],
        }),
        store: mockFn(undefined),
      },
      controlArtifacts: {
        create: mockFn({
          id: "artifact-1",
          title: "Report",
          url: "/artifacts/artifact-1",
        }),
      },
      controlProgress: {
        evaluate: mockFn({
          issueId: "issue-1",
          completionPercent: 75,
          status: "on_track",
        }),
        replan: mockFn({
          replanId: "replan-1",
          accepted: true,
        }),
      },
    },
  };
}

function createNoTeamCtx() {
  const ctx = createMockCtx();
  // @ts-expect-error - testing undefined teamId
  ctx.teamId = undefined;
  return ctx;
}

describe("control tools", () => {
  describe("agent tools", () => {
    it("control_agent_list returns agents", async () => {
      const { controlAgentListTool } = await import("../agents");
      const ctx = createMockCtx();
      const result = await controlAgentListTool.execute(
        { limit: 50 },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).agents).toHaveLength(1);
    });

    it("control_agent_list fails without teamId", async () => {
      const { controlAgentListTool } = await import("../agents");
      const result = await controlAgentListTool.execute(
        { limit: 50 },
        createNoTeamCtx() as any
      );
      expect(result.success).toBe(false);
    });

    it("control_agent_get returns agent details", async () => {
      const { controlAgentGetTool } = await import("../agents");
      const ctx = createMockCtx();
      const result = await controlAgentGetTool.execute(
        { agentId: "agent-1" },
        ctx as any
      );
      expect(result.success).toBe(true);
    });

    it("control_agent_get handles not found", async () => {
      const { controlAgentGetTool } = await import("../agents");
      const ctx = createMockCtx();
      ctx.services.controlAgents.get = mockFn(null);
      const result = await controlAgentGetTool.execute(
        { agentId: "nonexistent" },
        ctx as any
      );
      expect(result.success).toBe(false);
    });

    it("control_agent_wake triggers wakeup", async () => {
      const { controlAgentWakeTool } = await import("../agents");
      const ctx = createMockCtx();
      const result = await controlAgentWakeTool.execute(
        { agentId: "agent-1", reason: "test" },
        ctx as any
      );
      expect(result.success).toBe(true);
    });
  });

  describe("issue tools", () => {
    it("control_issue_create creates issue", async () => {
      const { controlIssueCreateTool } = await import("../issues");
      const ctx = createMockCtx();
      const result = await controlIssueCreateTool.execute(
        { title: "New Issue", priority: "MEDIUM" },
        ctx as any
      );
      expect(result.success).toBe(true);
    });

    it("control_issue_update handles not found", async () => {
      const { controlIssueUpdateTool } = await import("../issues");
      const ctx = createMockCtx();
      ctx.services.controlIssues.update = mockFn(null);
      const result = await controlIssueUpdateTool.execute(
        { issueId: "nonexistent", status: "CLOSED" },
        ctx as any
      );
      expect(result.success).toBe(false);
    });
  });

  describe("approval tools", () => {
    it("control_approval_request creates approval", async () => {
      const { controlApprovalRequestTool } = await import("../approvals");
      const ctx = createMockCtx();
      const result = await controlApprovalRequestTool.execute(
        {
          action: "Deploy to production",
          reason: "Release v2.0",
          expiresInMinutes: 60,
        },
        ctx as any
      );
      expect(result.success).toBe(true);
    });

    it("control_approval_respond handles not found", async () => {
      const { controlApprovalRespondTool } = await import("../approvals");
      const ctx = createMockCtx();
      ctx.services.controlApprovals.respond = mockFn(null);
      const result = await controlApprovalRespondTool.execute(
        { approvalId: "nonexistent", approved: true },
        ctx as any
      );
      expect(result.success).toBe(false);
    });
  });

  describe("cost tools", () => {
    it("control_cost_record records cost", async () => {
      const { controlCostRecordTool } = await import("../costs");
      const ctx = createMockCtx();
      const result = await controlCostRecordTool.execute(
        { agentId: "agent-1", provider: "anthropic", costCents: 50 },
        ctx as any
      );
      expect(result.success).toBe(true);
    });

    it("control_cost_query returns cost data", async () => {
      const { controlCostQueryTool } = await import("../costs");
      const ctx = createMockCtx();
      const result = await controlCostQueryTool.execute(
        { periodDays: 30 },
        ctx as any
      );
      expect(result.success).toBe(true);
    });
  });

  describe("goal tools", () => {
    it("control_goal_get handles not found", async () => {
      const { controlGoalGetTool } = await import("../goals");
      const ctx = createMockCtx();
      ctx.services.controlGoals.get = mockFn(null);
      const result = await controlGoalGetTool.execute(
        { goalId: "nonexistent" },
        ctx as any
      );
      expect(result.success).toBe(false);
    });
  });

  describe("project tools", () => {
    it("control_project_list returns projects", async () => {
      const { controlProjectListTool } = await import("../projects");
      const ctx = createMockCtx();
      const result = await controlProjectListTool.execute(
        { limit: 20 },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).projects).toHaveLength(1);
    });
  });

  describe("delegation tools", () => {
    it("control_agent_spawn creates approval request", async () => {
      const { controlAgentSpawnTool } = await import("../delegation");
      const ctx = createMockCtx();
      const result = await controlAgentSpawnTool.execute(
        {
          name: "QA Agent",
          role: "qa-tester",
          adapterType: "CLAUDE_LOCAL",
          reason: "Need automated QA",
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).approvalId).toBe("approval-2");
      expect(data(result).agentName).toBe("QA Agent");
    });

    it("control_agent_spawn fails without teamId", async () => {
      const { controlAgentSpawnTool } = await import("../delegation");
      const result = await controlAgentSpawnTool.execute(
        {
          name: "Test",
          role: "tester",
          adapterType: "PROCESS",
          reason: "test",
        },
        createNoTeamCtx() as any
      );
      expect(result.success).toBe(false);
    });

    it("control_agent_delegate wakes target with task payload", async () => {
      const { controlAgentDelegateTool } = await import("../delegation");
      const ctx = createMockCtx();
      const result = await controlAgentDelegateTool.execute(
        {
          agentId: "agent-1",
          task: "Review pull request #42",
          priority: "HIGH",
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).delegatedTo).toBe("agent-1");
    });
  });

  describe("communication tools", () => {
    it("control_message via issue comment", async () => {
      const { controlMessageTool } = await import("../communication");
      const ctx = createMockCtx();
      const result = await controlMessageTool.execute(
        {
          targetAgentId: "agent-1",
          message: "Analysis complete",
          issueId: "issue-1",
          wakeTarget: false,
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).method).toBe("issue_comment");
      expect(data(result).referenceId).toBeDefined();
    });

    it("control_message via wakeup", async () => {
      const { controlMessageTool } = await import("../communication");
      const ctx = createMockCtx();
      const result = await controlMessageTool.execute(
        {
          targetAgentId: "agent-1",
          message: "Check results",
          wakeTarget: true,
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).method).toBe("wakeup");
      expect(data(result).referenceId).toBeDefined();
    });

    it("control_message fails without teamId", async () => {
      const { controlMessageTool } = await import("../communication");
      const result = await controlMessageTool.execute(
        {
          targetAgentId: "agent-1",
          message: "test",
          wakeTarget: false,
        },
        createNoTeamCtx() as any
      );
      expect(result.success).toBe(false);
    });

    it("control_escalate creates approval request", async () => {
      const { controlEscalateTool } = await import("../communication");
      const ctx = createMockCtx();
      const result = await controlEscalateTool.execute(
        {
          subject: "Cannot resolve merge conflict",
          reason: "Conflicting changes in auth module",
          severity: "HIGH",
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).escalationId).toBe("approval-2");
    });
  });

  describe("memory tools", () => {
    it("control_memory_read returns content", async () => {
      const { controlMemoryReadTool } = await import("../memory");
      const ctx = createMockCtx();
      const result = await controlMemoryReadTool.execute(
        { category: "projects", name: "auth-refactor/progress" },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).found).toBe(true);
      expect(data(result).content).toContain("Step 1 complete");
    });

    it("control_memory_read returns not found", async () => {
      const { controlMemoryReadTool } = await import("../memory");
      const ctx = createMockCtx();
      ctx.services.controlMemory.read = mockFn(null);
      const result = await controlMemoryReadTool.execute(
        { category: "projects", name: "nonexistent" },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).found).toBe(false);
      expect(data(result).content).toBeNull();
    });

    it("control_memory_write stores content", async () => {
      const { controlMemoryWriteTool } = await import("../memory");
      const ctx = createMockCtx();
      const result = await controlMemoryWriteTool.execute(
        {
          category: "areas",
          name: "code-quality",
          content: "# Standards\nStrict TypeScript.",
          append: false,
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).written).toBe(true);
    });

    it("control_memory_read fails without teamId", async () => {
      const { controlMemoryReadTool } = await import("../memory");
      const result = await controlMemoryReadTool.execute(
        { category: "projects", name: "test" },
        createNoTeamCtx() as any
      );
      expect(result.success).toBe(false);
    });
  });

  describe("knowledge tools", () => {
    it("control_knowledge_query returns content", async () => {
      const { controlKnowledgeQueryTool } = await import("../knowledge");
      const ctx = createMockCtx();
      const result = await controlKnowledgeQueryTool.execute(
        { path: "conventions" },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).content).toContain("strict TypeScript");
    });

    it("control_knowledge_query handles not found", async () => {
      const { controlKnowledgeQueryTool } = await import("../knowledge");
      const ctx = createMockCtx();
      ctx.services.controlKnowledge.query = mockFn({ content: null });
      const result = await controlKnowledgeQueryTool.execute(
        { path: "nonexistent" },
        ctx as any
      );
      expect(result.success).toBe(false);
    });

    it("control_knowledge_query lists files when no path", async () => {
      const { controlKnowledgeQueryTool } = await import("../knowledge");
      const ctx = createMockCtx();
      ctx.services.controlKnowledge.query = mockFn({
        content: null,
        files: ["conventions.md", "runbook.md"],
      });
      const result = await controlKnowledgeQueryTool.execute({}, ctx as any);
      expect(result.success).toBe(true);
      expect(data(result).files).toHaveLength(2);
    });

    it("control_knowledge_store writes content", async () => {
      const { controlKnowledgeStoreTool } = await import("../knowledge");
      const ctx = createMockCtx();
      const result = await controlKnowledgeStoreTool.execute(
        {
          path: "decisions/002-caching",
          content: "# Caching Strategy\nUse Redis.",
          append: false,
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).stored).toBe(true);
    });
  });

  describe("artifact tools", () => {
    it("control_artifact_create creates artifact", async () => {
      const { controlArtifactCreateTool } = await import("../artifacts");
      const ctx = createMockCtx();
      const result = await controlArtifactCreateTool.execute(
        {
          title: "Security Audit Report",
          contentType: "text/markdown",
          content: "# Audit\nNo vulnerabilities found.",
          issueId: "issue-1",
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).id).toBe("artifact-1");
    });

    it("control_artifact_create fails without teamId", async () => {
      const { controlArtifactCreateTool } = await import("../artifacts");
      const result = await controlArtifactCreateTool.execute(
        {
          title: "Test",
          contentType: "text/plain",
          content: "test",
        },
        createNoTeamCtx() as any
      );
      expect(result.success).toBe(false);
    });
  });

  describe("progress tools", () => {
    it("control_evaluate_progress returns evaluation", async () => {
      const { controlEvaluateProgressTool } = await import("../progress");
      const ctx = createMockCtx();
      const result = await controlEvaluateProgressTool.execute(
        {
          issueId: "issue-1",
          completionPercent: 75,
          summary: "Core logic implemented, tests remaining",
          remainingWork: ["Write unit tests", "Update docs"],
          confidence: "HIGH",
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).completionPercent).toBe(75);
    });

    it("control_request_replan creates replan request", async () => {
      const { controlRequestReplanTool } = await import("../progress");
      const ctx = createMockCtx();
      const result = await controlRequestReplanTool.execute(
        {
          issueId: "issue-1",
          currentPlan: "Migrate DB in one step",
          reason: "Table too large for single migration",
          proposedPlan: "Migrate in 3 batches with backfill",
          estimatedImpact: "MODERATE",
        },
        ctx as any
      );
      expect(result.success).toBe(true);
      expect(data(result).replanId).toBe("replan-1");
    });

    it("control_evaluate_progress fails without teamId", async () => {
      const { controlEvaluateProgressTool } = await import("../progress");
      const result = await controlEvaluateProgressTool.execute(
        {
          completionPercent: 50,
          summary: "test",
          confidence: "MEDIUM",
        },
        createNoTeamCtx() as any
      );
      expect(result.success).toBe(false);
    });
  });
});
