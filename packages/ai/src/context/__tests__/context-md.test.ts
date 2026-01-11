import { describe, expect, it } from "bun:test";
import {
  buildContextMd,
  ConnectedResourceSchema,
  type ContextMdInput,
  createContextMdBuilder,
  parseContextMd,
  RecentActivitySchema,
  SessionStateSchema,
  TeamGuidelinesSchema,
  UserPreferencesSchema,
} from "../context-md";

describe("UserPreferencesSchema", () => {
  it("validates with defaults", () => {
    const result = UserPreferencesSchema.parse({});

    expect(result.responseStyle).toBe("concise");
    expect(result.prefersBulletPoints).toBe(true);
    expect(result.language).toBe("en");
  });

  it("validates full preferences", () => {
    const result = UserPreferencesSchema.parse({
      responseStyle: "detailed",
      prefersBulletPoints: false,
      timezone: "America/New_York",
      role: "Engineer",
      primaryProject: "Project Alpha",
      language: "es",
    });

    expect(result.responseStyle).toBe("detailed");
    expect(result.timezone).toBe("America/New_York");
  });

  it("rejects invalid response style", () => {
    expect(() =>
      UserPreferencesSchema.parse({ responseStyle: "invalid" })
    ).toThrow();
  });
});

describe("ConnectedResourceSchema", () => {
  it("validates resource data", () => {
    const result = ConnectedResourceSchema.parse({
      type: "slack",
      name: "Slack",
      documentCount: 1500,
      lastSyncAt: "2024-01-15T10:00:00Z",
      status: "active",
    });

    expect(result.type).toBe("slack");
    expect(result.documentCount).toBe(1500);
    expect(result.status).toBe("active");
  });

  it("allows null lastSyncAt", () => {
    const result = ConnectedResourceSchema.parse({
      type: "notion",
      name: "Notion",
      documentCount: 0,
      lastSyncAt: null,
      status: "syncing",
    });

    expect(result.lastSyncAt).toBeNull();
  });
});

describe("RecentActivitySchema", () => {
  it("validates activity data", () => {
    const result = RecentActivitySchema.parse({
      type: "search",
      description: "Searched for project docs",
      timestamp: Date.now(),
    });

    expect(result.type).toBe("search");
    expect(result.description).toBe("Searched for project docs");
  });

  it("allows optional documentId", () => {
    const result = RecentActivitySchema.parse({
      type: "view",
      description: "Viewed doc",
      timestamp: Date.now(),
      documentId: "doc_123",
    });

    expect(result.documentId).toBe("doc_123");
  });
});

describe("TeamGuidelinesSchema", () => {
  it("validates with defaults", () => {
    const result = TeamGuidelinesSchema.parse({});

    expect(result.citationRequired).toBe(true);
    expect(result.flagStaleContent).toBe(true);
    expect(result.staleThresholdDays).toBe(30);
    expect(result.escalateSecurityQuestions).toBe(true);
    expect(result.customInstructions).toEqual([]);
  });

  it("validates full guidelines", () => {
    const result = TeamGuidelinesSchema.parse({
      citationRequired: false,
      maxResponseLength: 500,
      flagStaleContent: false,
      staleThresholdDays: 7,
      escalateSecurityQuestions: false,
      customInstructions: ["Always use metric units", "Prioritize recent data"],
    });

    expect(result.customInstructions).toHaveLength(2);
    expect(result.citationRequired).toBe(false);
    expect(result.maxResponseLength).toBe(500);
  });
});

describe("SessionStateSchema", () => {
  it("validates with defaults", () => {
    const result = SessionStateSchema.parse({});

    expect(result.turnCount).toBe(0);
    expect(result.mentionedEntities).toEqual([]);
    expect(result.pendingTasks).toEqual([]);
  });

  it("validates full session state", () => {
    const result = SessionStateSchema.parse({
      turnCount: 5,
      activeConversationTopic: "Project planning",
      mentionedEntities: ["John", "Marketing Team"],
      pendingTasks: ["Review document", "Send summary"],
    });

    expect(result.turnCount).toBe(5);
    expect(result.mentionedEntities).toContain("John");
  });
});

function createFullInput(
  overrides: Partial<ContextMdInput> = {}
): ContextMdInput {
  return {
    identity: {
      teamId: "team_1",
      userId: "user_1",
      teamName: "Engineering",
    },
    preferences: UserPreferencesSchema.parse({}),
    resources: [],
    recentActivity: [],
    guidelines: TeamGuidelinesSchema.parse({}),
    sessionState: SessionStateSchema.parse({}),
    ...overrides,
  };
}

describe("buildContextMd", () => {
  it("builds minimal context", () => {
    const input = createFullInput();
    const result = buildContextMd(input);

    expect(result).toContain("# context.md");
    expect(result).toContain("Engineering");
  });

  it("includes user preferences section", () => {
    const input = createFullInput({
      preferences: UserPreferencesSchema.parse({
        responseStyle: "detailed",
        timezone: "America/New_York",
      }),
    });

    const result = buildContextMd(input);

    expect(result).toContain("User Preferences");
    expect(result).toContain("detailed");
    expect(result).toContain("America/New_York");
  });

  it("includes connected resources section", () => {
    const input = createFullInput({
      resources: [
        {
          type: "slack",
          name: "Slack",
          documentCount: 1500,
          lastSyncAt: new Date().toISOString(),
          status: "active",
        },
      ],
    });

    const result = buildContextMd(input);

    expect(result).toContain("Available Resources");
    expect(result).toContain("Slack");
    expect(result).toContain("1,500");
  });

  it("includes guidelines section", () => {
    const input = createFullInput({
      guidelines: TeamGuidelinesSchema.parse({
        customInstructions: ["Always cite sources", "Use metric units"],
      }),
    });

    const result = buildContextMd(input);

    expect(result).toContain("Guidelines");
    expect(result).toContain("Always cite sources");
  });

  it("respects maxTokenBudget option", () => {
    const input = createFullInput({
      resources: new Array(20).fill(null).map((_, i) => ({
        type: "notion",
        name: `Notion ${i}`,
        documentCount: 100,
        lastSyncAt: null,
        status: "active" as const,
      })),
    });

    const result = buildContextMd(input, { maxTokenBudget: 500 });

    expect(result.length).toBeLessThan(5000);
  });
});

describe("createContextMdBuilder", () => {
  it("creates builder with identity", () => {
    const builder = createContextMdBuilder("team_1", "user_1", "Engineering");

    const result = builder.build();

    expect(result).toContain("Engineering");
  });

  it("allows chained configuration", () => {
    const builder = createContextMdBuilder("team_1", "user_1", "Engineering");

    builder
      .setIdentity({
        teamId: "team_1",
        userId: "user_1",
        teamName: "Engineering",
        userName: "John",
        agentRole: "Research Assistant",
      })
      .setPreferences({
        responseStyle: "detailed",
      })
      .setGuidelines({
        customInstructions: ["Be casual"],
      });

    const result = builder.build();

    expect(result).toContain("Research Assistant");
    expect(result).toContain("detailed");
    expect(result).toContain("Be casual");
  });

  it("adds resources and activities", () => {
    const builder = createContextMdBuilder("team_1", "user_1", "Engineering");

    builder
      .addResource({
        type: "slack",
        name: "Slack",
        documentCount: 500,
        lastSyncAt: null,
        status: "active",
      })
      .addActivity({
        type: "search",
        description: "Searched for docs",
        timestamp: Date.now(),
      });

    const result = builder.build();

    expect(result).toContain("Slack");
    expect(result).toContain("Recent Activity");
  });

  it("updates session state", () => {
    const builder = createContextMdBuilder("team_1", "user_1", "Engineering");

    builder.updateSession({
      turnCount: 3,
      activeConversationTopic: "Planning",
    });

    const result = builder.build();

    expect(result).toContain("Current State");
    expect(result).toContain("Turn 3");
    expect(result).toContain("Planning");
  });

  it("sets memory context", () => {
    const builder = createContextMdBuilder("team_1", "user_1", "Engineering");

    builder.setMemory({
      episodic: "Recent conversation summary",
      semantic: "Key facts learned",
      procedural: "Learned patterns",
    });

    const result = builder.build({ includeMemory: true });

    expect(result).toContain("Memory");
    expect(result).toContain("Recent conversation summary");
  });
});

describe("parseContextMd", () => {
  it("parses session state section", () => {
    const markdown = `# context.md

## Current State
- Active topic: Project Planning
- Mentioned: John, Marketing
- Turn 5 of conversation
`;

    const result = parseContextMd(markdown);

    expect(result.sessionState?.activeConversationTopic).toBe(
      "Project Planning"
    );
    expect(result.sessionState?.mentionedEntities).toContain("John");
    expect(result.sessionState?.turnCount).toBe(5);
  });

  it("parses recent activity section", () => {
    const markdown = `# context.md

## Recent Activity
- Searched for project documentation
- Viewed Engineering OKRs
`;

    const result = parseContextMd(markdown);

    expect(result.recentActivity).toHaveLength(2);
    expect(result.recentActivity?.[0]?.type).toBe("search");
  });

  it("handles empty markdown", () => {
    const result = parseContextMd("");

    expect(result).toEqual({});
  });

  it("handles markdown without recognized sections", () => {
    const markdown = `# Some Document

## Unrecognized Section
Content here
`;

    const result = parseContextMd(markdown);

    expect(result.sessionState).toBeUndefined();
    expect(result.recentActivity).toBeUndefined();
  });
});
