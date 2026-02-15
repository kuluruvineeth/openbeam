import { describe, expect, it } from "bun:test";
import {
  AgentHealthSummarySchema,
  AgentMessageItemSchema,
  CreateMissionFromPromptSchema,
  CrossMissionLinkItemSchema,
  MissionActionDecisionSchema,
  MissionAgentLaneStateSchema,
  MissionApprovalQueueItemSchema,
  MissionArtifactItemSchema,
  MissionEventLedgerItemSchema,
  MissionEventPayloadSchema,
  MissionExecutionLaneSchema,
  MissionRunTableRowSchema,
  MissionRunVisibilitySchema,
  MissionTemplateSchema,
  ReflectionHistoryEntrySchema,
  StartMissionRunSchema,
} from "../index";

describe("MissionExecutionLaneSchema", () => {
  it("accepts valid lanes", () => {
    for (const lane of ["linear", "autonomous", "hybrid"] as const) {
      expect(MissionExecutionLaneSchema.parse(lane)).toBe(lane);
    }
  });

  it("rejects invalid lane", () => {
    expect(() => MissionExecutionLaneSchema.parse("manual")).toThrow();
  });
});

describe("MissionRunVisibilitySchema", () => {
  it("accepts valid visibility levels", () => {
    for (const v of ["private", "team", "public"] as const) {
      expect(MissionRunVisibilitySchema.parse(v)).toBe(v);
    }
  });

  it("rejects invalid visibility", () => {
    expect(() => MissionRunVisibilitySchema.parse("secret")).toThrow();
  });
});

describe("MissionActionDecisionSchema", () => {
  it("accepts valid decisions", () => {
    for (const d of ["auto", "require_approval", "block"] as const) {
      expect(MissionActionDecisionSchema.parse(d)).toBe(d);
    }
  });

  it("rejects invalid decision", () => {
    expect(() => MissionActionDecisionSchema.parse("skip")).toThrow();
  });
});

describe("MissionRunTableRowSchema", () => {
  const validRow = {
    id: "run-1",
    missionId: "m-1",
    missionName: "Research Q1",
    status: "running",
    lane: "autonomous" as const,
    agentCount: 3,
    taskCount: 10,
    completedTasks: 4,
    costCents: 250,
    updatedAt: 1_700_000_000_000,
  };

  it("parses valid row", () => {
    const result = MissionRunTableRowSchema.parse(validRow);
    expect(result.id).toBe("run-1");
    expect(result.lane).toBe("autonomous");
    expect(result.agentCount).toBe(3);
  });

  it("accepts optional startedAt", () => {
    const result = MissionRunTableRowSchema.parse({
      ...validRow,
      startedAt: 1_700_000_000_000,
    });
    expect(result.startedAt).toBe(1_700_000_000_000);
  });

  it("omits startedAt when absent", () => {
    const result = MissionRunTableRowSchema.parse(validRow);
    expect(result.startedAt).toBeUndefined();
  });

  it("rejects invalid lane", () => {
    expect(() =>
      MissionRunTableRowSchema.parse({ ...validRow, lane: "invalid" })
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    const { missionName: _, ...incomplete } = validRow;
    expect(() => MissionRunTableRowSchema.parse(incomplete)).toThrow();
  });
});

describe("MissionAgentLaneStateSchema", () => {
  const validState = {
    agentId: "a-1",
    agentName: "Researcher",
    role: "analyst",
    status: "running" as const,
    stepsCompleted: 12,
    tokensUsed: 5000,
    costCents: 50,
  };

  it("parses valid state", () => {
    const result = MissionAgentLaneStateSchema.parse(validState);
    expect(result.agentName).toBe("Researcher");
    expect(result.status).toBe("running");
  });

  it("accepts all valid statuses", () => {
    for (const status of [
      "idle",
      "running",
      "blocked",
      "completed",
      "failed",
    ] as const) {
      const result = MissionAgentLaneStateSchema.parse({
        ...validState,
        status,
      });
      expect(result.status).toBe(status);
    }
  });

  it("accepts optional task fields", () => {
    const result = MissionAgentLaneStateSchema.parse({
      ...validState,
      currentTaskId: "t-1",
      currentTaskTitle: "Research competitors",
      lastActivityAt: 1_700_000_000_000,
    });
    expect(result.currentTaskId).toBe("t-1");
    expect(result.currentTaskTitle).toBe("Research competitors");
  });

  it("applies defaults for section 7 extension fields", () => {
    const result = MissionAgentLaneStateSchema.parse(validState);

    expect(result.replanCount).toBe(0);
    expect(result.isReflecting).toBe(false);
    expect(result.spawnDepth).toBe(0);
    expect(result.crossMissionLinks).toEqual([]);
  });

  it("rejects invalid status", () => {
    expect(() =>
      MissionAgentLaneStateSchema.parse({ ...validState, status: "sleeping" })
    ).toThrow();
  });
});

describe("MissionEventLedgerItemSchema", () => {
  const validItem = {
    eventId: "evt-1",
    missionId: "m-1",
    runId: "r-1",
    lane: "linear" as const,
    sequence: 42,
    eventType: "task.completed",
    summary: "Completed research task",
    timestamp: 1_700_000_000_000,
  };

  it("parses valid item", () => {
    const result = MissionEventLedgerItemSchema.parse(validItem);
    expect(result.eventId).toBe("evt-1");
    expect(result.sequence).toBe(42);
  });

  it("accepts optional agentName and payload", () => {
    const result = MissionEventLedgerItemSchema.parse({
      ...validItem,
      agentName: "Researcher",
      payload: { taskId: "t-1", duration: 3000 },
    });
    expect(result.agentName).toBe("Researcher");
    expect(result.payload?.taskId).toBe("t-1");
  });

  it("omits optional fields when absent", () => {
    const result = MissionEventLedgerItemSchema.parse(validItem);
    expect(result.agentName).toBeUndefined();
    expect(result.payload).toBeUndefined();
  });
});

describe("MissionApprovalQueueItemSchema", () => {
  const validApproval = {
    approvalId: "apr-1",
    missionId: "m-1",
    runId: "r-1",
    agentName: "Deployer",
    actionIntent: "delete production database",
    riskLevel: "critical" as const,
    status: "pending" as const,
    requestedAt: 1_700_000_000_000,
  };

  it("parses valid approval", () => {
    const result = MissionApprovalQueueItemSchema.parse(validApproval);
    expect(result.riskLevel).toBe("critical");
    expect(result.status).toBe("pending");
  });

  it("accepts all risk levels", () => {
    for (const riskLevel of ["low", "medium", "high", "critical"] as const) {
      const result = MissionApprovalQueueItemSchema.parse({
        ...validApproval,
        riskLevel,
      });
      expect(result.riskLevel).toBe(riskLevel);
    }
  });

  it("accepts all statuses", () => {
    for (const status of [
      "pending",
      "approved",
      "rejected",
      "escalated",
    ] as const) {
      const result = MissionApprovalQueueItemSchema.parse({
        ...validApproval,
        status,
      });
      expect(result.status).toBe(status);
    }
  });

  it("accepts optional resolution fields", () => {
    const result = MissionApprovalQueueItemSchema.parse({
      ...validApproval,
      status: "approved",
      resolvedAt: 1_700_000_001_000,
      resolvedById: "user-1",
      reason: "Safe to proceed",
    });
    expect(result.resolvedAt).toBe(1_700_000_001_000);
    expect(result.resolvedById).toBe("user-1");
    expect(result.reason).toBe("Safe to proceed");
  });
});

describe("MissionArtifactItemSchema", () => {
  const validArtifact = {
    artifactId: "art-1",
    missionId: "m-1",
    runId: "r-1",
    agentName: "Writer",
    title: "Q1 Report",
    type: "report" as const,
    version: 1,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  };

  it("parses valid artifact", () => {
    const result = MissionArtifactItemSchema.parse(validArtifact);
    expect(result.title).toBe("Q1 Report");
    expect(result.type).toBe("report");
  });

  it("accepts all artifact types", () => {
    for (const type of [
      "document",
      "report",
      "code",
      "data",
      "image",
      "other",
    ] as const) {
      const result = MissionArtifactItemSchema.parse({
        ...validArtifact,
        type,
      });
      expect(result.type).toBe(type);
    }
  });

  it("accepts optional content and url", () => {
    const result = MissionArtifactItemSchema.parse({
      ...validArtifact,
      content: { sections: ["intro", "body", "conclusion"] },
      url: "https://storage.example.com/art-1.pdf",
    });
    expect(result.url).toBe("https://storage.example.com/art-1.pdf");
  });
});

describe("MissionTemplateSchema", () => {
  const validTemplate = {
    id: "tpl-1",
    name: "Market Research",
    description: "Multi-agent market research template",
    vertical: "research",
    agents: [
      {
        name: "researcher",
        role: "analyst",
        soulPrompt: "You are a market researcher",
        tools: ["search_hybrid", "doc_get"],
      },
    ],
    tasks: [
      {
        title: "Competitor analysis",
        description: "Analyze top 5 competitors",
        priority: "P0" as const,
      },
    ],
  };

  it("parses valid template", () => {
    const result = MissionTemplateSchema.parse(validTemplate);
    expect(result.name).toBe("Market Research");
    expect(result.agents).toHaveLength(1);
    expect(result.tasks).toHaveLength(1);
  });

  it("validates nested agent structure", () => {
    const result = MissionTemplateSchema.parse(validTemplate);
    const firstAgent = result.agents[0];
    expect(firstAgent).toBeDefined();
    expect(firstAgent?.name).toBe("researcher");
    expect(firstAgent?.tools).toEqual(["search_hybrid", "doc_get"]);
  });

  it("validates task priorities", () => {
    for (const priority of ["P0", "P1", "P2", "P3"] as const) {
      const result = MissionTemplateSchema.parse({
        ...validTemplate,
        tasks: [{ ...validTemplate.tasks[0], priority }],
      });
      const firstTask = result.tasks[0];
      expect(firstTask).toBeDefined();
      expect(firstTask?.priority).toBe(priority);
    }
  });

  it("rejects invalid task priority", () => {
    expect(() =>
      MissionTemplateSchema.parse({
        ...validTemplate,
        tasks: [{ ...validTemplate.tasks[0], priority: "P5" }],
      })
    ).toThrow();
  });

  it("accepts optional complianceProfile", () => {
    const result = MissionTemplateSchema.parse({
      ...validTemplate,
      complianceProfile: "SOC2",
    });
    expect(result.complianceProfile).toBe("SOC2");
  });

  it("accepts multiple agents and tasks", () => {
    const result = MissionTemplateSchema.parse({
      ...validTemplate,
      agents: [
        ...validTemplate.agents,
        {
          name: "writer",
          role: "content",
          soulPrompt: "You are a technical writer",
          tools: ["doc_get"],
        },
      ],
      tasks: [
        ...validTemplate.tasks,
        {
          title: "Write report",
          description: "Synthesize findings",
          priority: "P1" as const,
        },
      ],
    });
    expect(result.agents).toHaveLength(2);
    expect(result.tasks).toHaveLength(2);
  });
});

describe("AgentMessageItemSchema", () => {
  it("parses message item payload", () => {
    const result = AgentMessageItemSchema.parse({
      messageId: "msg-1",
      missionId: "m-1",
      fromAgentId: "a-1",
      fromAgentName: "Agent A",
      toAgentId: "a-2",
      toAgentName: "Agent B",
      channel: "direct",
      contentPreview: "Need status update",
      timestamp: 1_700_000_000_000,
    });

    expect(result.channel).toBe("direct");
    expect(result.fromAgentName).toBe("Agent A");
  });
});

describe("ReflectionHistoryEntrySchema", () => {
  it("applies default triggeredReplan flag", () => {
    const result = ReflectionHistoryEntrySchema.parse({
      entryId: "reflection-1",
      agentId: "a-1",
      agentName: "Agent A",
      stepNumber: 3,
      score: 0.25,
      verbalMemory: "Current approach is not producing new artifacts",
      timestamp: 1_700_000_000_000,
    });

    expect(result.triggeredReplan).toBe(false);
  });
});

describe("AgentHealthSummarySchema", () => {
  it("parses health summary with agents and patterns", () => {
    const result = AgentHealthSummarySchema.parse({
      missionId: "m-1",
      totalAgents: 3,
      progressingCount: 1,
      stuckCount: 1,
      escalatedCount: 1,
      agents: [
        {
          agentId: "a-1",
          agentName: "Agent A",
          progressScore: 0.2,
          replanCount: 2,
          healthStatus: "stuck",
          recentScores: [0.5, 0.3, 0.2],
          stuckReason: "Repeated dead-end strategy",
          escalationReason: null,
        },
      ],
      failurePatterns: [
        {
          pattern: "Repeated broad search without narrowing constraints",
          frequency: 2,
          affectedAgents: ["a-1"],
        },
      ],
      computedAt: 1_700_000_000_000,
    });

    expect(result.stuckCount).toBe(1);
    expect(result.agents[0]?.healthStatus).toBe("stuck");
  });
});

describe("CrossMissionLinkItemSchema", () => {
  it("parses cross-mission link item", () => {
    const result = CrossMissionLinkItemSchema.parse({
      linkId: "link-1",
      sourceMissionId: "m-src",
      sourceMissionName: "Source",
      targetMissionId: "m-dst",
      targetMissionName: "Target",
      linkType: "knowledge",
      timestamp: 1_700_000_000_000,
    });

    expect(result.linkType).toBe("knowledge");
  });
});

describe("MissionEventPayloadSchema", () => {
  const validPayload = {
    missionId: "m-1",
    runId: "r-1",
    lane: "autonomous" as const,
    sequence: 0,
    eventType: "mission.started",
    timestamp: 1_700_000_000_000,
    payload: {},
  };

  it("parses valid payload", () => {
    const result = MissionEventPayloadSchema.parse(validPayload);
    expect(result.missionId).toBe("m-1");
    expect(result.eventType).toBe("mission.started");
  });

  it("accepts arbitrary payload data", () => {
    const result = MissionEventPayloadSchema.parse({
      ...validPayload,
      payload: { taskId: "t-1", agentName: "Researcher", count: 42 },
    });
    expect(result.payload.taskId).toBe("t-1");
    expect(result.payload.count).toBe(42);
  });

  it("requires payload field", () => {
    const { payload: _, ...withoutPayload } = validPayload;
    expect(() => MissionEventPayloadSchema.parse(withoutPayload)).toThrow();
  });
});

describe("CreateMissionFromPromptSchema", () => {
  it("parses minimal input with defaults", () => {
    const result = CreateMissionFromPromptSchema.parse({
      teamId: "team-1",
      objective: "Research competitors",
    });
    expect(result.teamId).toBe("team-1");
    expect(result.lane).toBe("autonomous");
    expect(result.maxConcurrentRuns).toBe(3);
  });

  it("accepts explicit lane override", () => {
    const result = CreateMissionFromPromptSchema.parse({
      teamId: "team-1",
      objective: "Sequential analysis",
      lane: "linear",
    });
    expect(result.lane).toBe("linear");
  });

  it("accepts all optional fields", () => {
    const result = CreateMissionFromPromptSchema.parse({
      teamId: "team-1",
      objective: "Full research",
      templateId: "tpl-1",
      lane: "hybrid",
      budgetCents: 5000,
      maxConcurrentRuns: 7,
    });
    expect(result.templateId).toBe("tpl-1");
    expect(result.budgetCents).toBe(5000);
    expect(result.maxConcurrentRuns).toBe(7);
  });

  it("rejects empty objective", () => {
    expect(() =>
      CreateMissionFromPromptSchema.parse({
        teamId: "team-1",
        objective: "",
      })
    ).toThrow();
  });

  it("rejects maxConcurrentRuns below 1", () => {
    expect(() =>
      CreateMissionFromPromptSchema.parse({
        teamId: "team-1",
        objective: "Test",
        maxConcurrentRuns: 0,
      })
    ).toThrow();
  });

  it("rejects maxConcurrentRuns above 10", () => {
    expect(() =>
      CreateMissionFromPromptSchema.parse({
        teamId: "team-1",
        objective: "Test",
        maxConcurrentRuns: 11,
      })
    ).toThrow();
  });
});

describe("StartMissionRunSchema", () => {
  it("parses with missionId only", () => {
    const result = StartMissionRunSchema.parse({ missionId: "m-1" });
    expect(result.missionId).toBe("m-1");
    expect(result.lane).toBeUndefined();
  });

  it("accepts optional lane", () => {
    const result = StartMissionRunSchema.parse({
      missionId: "m-1",
      lane: "linear",
    });
    expect(result.lane).toBe("linear");
  });

  it("rejects missing missionId", () => {
    expect(() => StartMissionRunSchema.parse({})).toThrow();
  });

  it("rejects invalid lane", () => {
    expect(() =>
      StartMissionRunSchema.parse({ missionId: "m-1", lane: "invalid" })
    ).toThrow();
  });
});
