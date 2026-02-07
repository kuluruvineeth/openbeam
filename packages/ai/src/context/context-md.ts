import { z } from "zod";

const SECTION_PATTERN = /## ([^\n]+)\n([\s\S]*?)(?=## |\n# |$)/g;
const TURN_PATTERN = /- Turn (\d+) of conversation/;
const LIST_ITEM_PREFIX = /^- /;

export const UserPreferencesSchema = z.object({
  responseStyle: z
    .enum(["concise", "detailed", "technical", "casual"])
    .default("concise"),
  prefersBulletPoints: z.boolean().default(true),
  timezone: z.string().optional(),
  role: z.string().optional(),
  primaryProject: z.string().optional(),
  language: z.string().default("en"),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const ConnectedResourceSchema = z.object({
  type: z.string(),
  name: z.string(),
  documentCount: z.number(),
  lastSyncAt: z.string().nullable(),
  status: z.enum(["active", "syncing", "error", "disconnected"]),
});

export type ConnectedResource = z.infer<typeof ConnectedResourceSchema>;

export const RecentActivitySchema = z.object({
  type: z.enum(["search", "view", "edit", "sync", "question"]),
  description: z.string(),
  timestamp: z.number(),
  documentId: z.string().optional(),
  documentTitle: z.string().optional(),
});

export type RecentActivity = z.infer<typeof RecentActivitySchema>;

export const TeamGuidelinesSchema = z.object({
  citationRequired: z.boolean().default(true),
  maxResponseLength: z.number().optional(),
  flagStaleContent: z.boolean().default(true),
  staleThresholdDays: z.number().default(30),
  escalateSecurityQuestions: z.boolean().default(true),
  customInstructions: z.array(z.string()).default([]),
});

export type TeamGuidelines = z.infer<typeof TeamGuidelinesSchema>;

export const SessionStateSchema = z.object({
  activeConversationTopic: z.string().optional(),
  mentionedEntities: z.array(z.string()).default([]),
  pendingTasks: z.array(z.string()).default([]),
  lastToolUsed: z.string().optional(),
  turnCount: z.number().default(0),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

export interface ContextMdInput {
  identity: {
    teamName: string;
    teamId: string;
    userId: string;
    userName?: string;
    agentRole?: string;
  };
  preferences: UserPreferences;
  resources: ConnectedResource[];
  recentActivity: RecentActivity[];
  guidelines: TeamGuidelines;
  sessionState: SessionState;
  memoryContext?: {
    episodic: string;
    semantic: string;
    procedural: string;
  };
}

export interface ContextMdOptions {
  maxActivityItems?: number;
  maxResourceItems?: number;
  includeMemory?: boolean;
  maxTokenBudget?: number;
}

const DEFAULT_OPTIONS: Required<ContextMdOptions> = {
  maxActivityItems: 10,
  maxResourceItems: 20,
  includeMemory: true,
  maxTokenBudget: 4000,
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minutes ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toISOString().split("T")[0] ?? date.toISOString();
}

function formatActivityType(type: RecentActivity["type"]): string {
  const map: Record<RecentActivity["type"], string> = {
    search: "Searched for",
    view: "Viewed",
    edit: "Edited",
    sync: "Synced",
    question: "Asked about",
  };
  return map[type];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildContextMd(
  input: ContextMdInput,
  options?: ContextMdOptions
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections: string[] = [];
  let totalTokens = 0;

  const identitySection = buildIdentitySection(input.identity);
  totalTokens += estimateTokens(identitySection);
  sections.push(identitySection);

  const preferencesSection = buildPreferencesSection(input.preferences);
  totalTokens += estimateTokens(preferencesSection);
  sections.push(preferencesSection);

  const resourcesSection = buildResourcesSection(
    input.resources,
    opts.maxResourceItems
  );
  totalTokens += estimateTokens(resourcesSection);
  sections.push(resourcesSection);

  const activitySection = buildActivitySection(
    input.recentActivity,
    opts.maxActivityItems
  );
  totalTokens += estimateTokens(activitySection);
  sections.push(activitySection);

  const guidelinesSection = buildGuidelinesSection(input.guidelines);
  totalTokens += estimateTokens(guidelinesSection);
  sections.push(guidelinesSection);

  const sessionSection = buildSessionSection(input.sessionState);
  totalTokens += estimateTokens(sessionSection);
  sections.push(sessionSection);

  if (opts.includeMemory && input.memoryContext) {
    const remainingBudget = opts.maxTokenBudget - totalTokens;
    if (remainingBudget > 500) {
      const memorySection = buildMemorySection(
        input.memoryContext,
        remainingBudget
      );
      sections.push(memorySection);
    }
  }

  return `# context.md\n\n${sections.join("\n")}`;
}

function buildIdentitySection(identity: ContextMdInput["identity"]): string {
  const lines = ["## Identity"];
  lines.push(
    `You are an enterprise search assistant for ${identity.teamName}.`
  );

  if (identity.agentRole) {
    lines.push(`Role: ${identity.agentRole}`);
  }

  return `${lines.join("\n")}\n`;
}

function buildPreferencesSection(preferences: UserPreferences): string {
  const lines = ["## User Preferences"];

  const styleDescriptions: Record<UserPreferences["responseStyle"], string> = {
    concise: "Prefers concise answers with bullet points",
    detailed: "Prefers detailed, comprehensive explanations",
    technical: "Prefers technical depth with code examples",
    casual: "Prefers casual, conversational tone",
  };

  lines.push(`- ${styleDescriptions[preferences.responseStyle]}`);

  if (preferences.primaryProject) {
    lines.push(`- Works primarily on: ${preferences.primaryProject}`);
  }

  if (preferences.timezone) {
    lines.push(`- Timezone: ${preferences.timezone}`);
  }

  if (preferences.role) {
    lines.push(`- Role: ${preferences.role}`);
  }

  return `${lines.join("\n")}\n`;
}

function buildResourcesSection(
  resources: ConnectedResource[],
  maxItems: number
): string {
  const lines = ["## Available Resources"];

  if (resources.length === 0) {
    lines.push("No data sources connected yet.");
    return `${lines.join("\n")}\n`;
  }

  const activeResources = resources.filter((r) => r.status === "active");
  const totalDocs = resources.reduce((sum, r) => sum + r.documentCount, 0);

  lines.push(`- ${activeResources.length} connected data sources`);
  lines.push(`- ${totalDocs.toLocaleString()} indexed documents`);

  const latestSync = resources
    .map((r) => (r.lastSyncAt ? new Date(r.lastSyncAt).getTime() : 0))
    .filter((t) => t > 0)
    .sort((a, b) => b - a)[0];

  if (latestSync) {
    lines.push(`- Last sync: ${formatTimestamp(latestSync)}`);
  }

  lines.push("");
  lines.push("### Sources");

  const displayed = resources.slice(0, maxItems);
  for (const resource of displayed) {
    const status = resource.status === "active" ? "" : ` [${resource.status}]`;
    lines.push(
      `- ${resource.name} (${resource.type}): ${resource.documentCount.toLocaleString()} docs${status}`
    );
  }

  if (resources.length > maxItems) {
    lines.push(`- ... and ${resources.length - maxItems} more`);
  }

  return `${lines.join("\n")}\n`;
}

function buildActivitySection(
  activity: RecentActivity[],
  maxItems: number
): string {
  const lines = ["## Recent Activity"];

  if (activity.length === 0) {
    lines.push("No recent activity recorded.");
    return `${lines.join("\n")}\n`;
  }

  const sorted = [...activity].sort((a, b) => b.timestamp - a.timestamp);
  const displayed = sorted.slice(0, maxItems);

  for (const item of displayed) {
    const action = formatActivityType(item.type);
    const time = formatTimestamp(item.timestamp);

    if (item.documentTitle) {
      lines.push(`- ${action} "${item.documentTitle}" (${time})`);
    } else {
      lines.push(`- ${action} ${item.description} (${time})`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildGuidelinesSection(guidelines: TeamGuidelines): string {
  const lines = ["## Guidelines"];

  if (guidelines.citationRequired) {
    lines.push("- ALWAYS cite sources using [1], [2] notation");
  }

  if (guidelines.flagStaleContent) {
    lines.push(
      `- Flag when information is older than ${guidelines.staleThresholdDays} days`
    );
  }

  if (guidelines.escalateSecurityQuestions) {
    lines.push("- Escalate security-related questions to admin");
  }

  if (guidelines.maxResponseLength) {
    lines.push(
      `- Keep responses under ${guidelines.maxResponseLength} words when possible`
    );
  }

  for (const instruction of guidelines.customInstructions) {
    lines.push(`- ${instruction}`);
  }

  return `${lines.join("\n")}\n`;
}

function buildSessionSection(session: SessionState): string {
  const lines = ["## Current State"];

  if (session.activeConversationTopic) {
    lines.push(`- Active topic: ${session.activeConversationTopic}`);
  }

  if (session.mentionedEntities.length > 0) {
    lines.push(`- Mentioned: ${session.mentionedEntities.join(", ")}`);
  }

  if (session.pendingTasks.length > 0) {
    lines.push("- Pending tasks:");
    for (const task of session.pendingTasks) {
      lines.push(`  - ${task}`);
    }
  }

  if (session.turnCount > 0) {
    lines.push(`- Turn ${session.turnCount} of conversation`);
  }

  if (lines.length === 1) {
    lines.push("- Starting fresh conversation");
  }

  return `${lines.join("\n")}\n`;
}

function buildMemorySection(
  memory: NonNullable<ContextMdInput["memoryContext"]>,
  tokenBudget: number
): string {
  const lines = ["## Memory"];

  const totalMemoryTokens =
    estimateTokens(memory.episodic) +
    estimateTokens(memory.semantic) +
    estimateTokens(memory.procedural);

  if (totalMemoryTokens > tokenBudget) {
    const ratio = tokenBudget / totalMemoryTokens;

    if (memory.semantic) {
      const truncated = truncateToTokens(
        memory.semantic,
        Math.floor(estimateTokens(memory.semantic) * ratio * 0.4)
      );
      if (truncated) {
        lines.push("### Relevant Knowledge");
        lines.push(truncated);
      }
    }

    if (memory.procedural) {
      const truncated = truncateToTokens(
        memory.procedural,
        Math.floor(estimateTokens(memory.procedural) * ratio * 0.3)
      );
      if (truncated) {
        lines.push("### Learned Patterns");
        lines.push(truncated);
      }
    }

    if (memory.episodic) {
      const truncated = truncateToTokens(
        memory.episodic,
        Math.floor(estimateTokens(memory.episodic) * ratio * 0.3)
      );
      if (truncated) {
        lines.push("### Recent Interactions");
        lines.push(truncated);
      }
    }
  } else {
    if (memory.semantic) {
      lines.push("### Relevant Knowledge");
      lines.push(memory.semantic);
    }
    if (memory.procedural) {
      lines.push("### Learned Patterns");
      lines.push(memory.procedural);
    }
    if (memory.episodic) {
      lines.push("### Recent Interactions");
      lines.push(memory.episodic);
    }
  }

  return `${lines.join("\n")}\n`;
}

function truncateToTokens(text: string, maxTokens: number): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let tokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);
    if (tokens + lineTokens > maxTokens) {
      break;
    }
    result.push(line);
    tokens += lineTokens;
  }

  return result.join("\n");
}

export interface ContextMdBuilder {
  setIdentity(identity: ContextMdInput["identity"]): ContextMdBuilder;
  setPreferences(preferences: Partial<UserPreferences>): ContextMdBuilder;
  addResource(resource: ConnectedResource): ContextMdBuilder;
  addActivity(activity: RecentActivity): ContextMdBuilder;
  setGuidelines(guidelines: Partial<TeamGuidelines>): ContextMdBuilder;
  updateSession(updates: Partial<SessionState>): ContextMdBuilder;
  setMemory(memory: ContextMdInput["memoryContext"]): ContextMdBuilder;
  build(options?: ContextMdOptions): string;
  getInput(): ContextMdInput;
}

export function createContextMdBuilder(
  teamId: string,
  userId: string,
  teamName: string
): ContextMdBuilder {
  const input: ContextMdInput = {
    identity: { teamId, userId, teamName },
    preferences: UserPreferencesSchema.parse({}),
    resources: [],
    recentActivity: [],
    guidelines: TeamGuidelinesSchema.parse({}),
    sessionState: SessionStateSchema.parse({}),
  };

  const builder: ContextMdBuilder = {
    setIdentity(identity) {
      input.identity = identity;
      return builder;
    },

    setPreferences(preferences) {
      input.preferences = { ...input.preferences, ...preferences };
      return builder;
    },

    addResource(resource) {
      input.resources.push(resource);
      return builder;
    },

    addActivity(activity) {
      input.recentActivity.push(activity);
      return builder;
    },

    setGuidelines(guidelines) {
      input.guidelines = { ...input.guidelines, ...guidelines };
      return builder;
    },

    updateSession(updates) {
      input.sessionState = { ...input.sessionState, ...updates };
      return builder;
    },

    setMemory(memory) {
      input.memoryContext = memory;
      return builder;
    },

    build(options) {
      return buildContextMd(input, options);
    },

    getInput() {
      return input;
    },
  };

  return builder;
}

export function parseContextMd(markdown: string): Partial<ContextMdInput> {
  const result: Partial<ContextMdInput> = {};
  const matches = markdown.matchAll(SECTION_PATTERN);

  for (const match of matches) {
    const sectionName = match[1]?.trim();
    const content = match[2]?.trim();

    if (!(sectionName && content)) {
      continue;
    }

    if (sectionName === "Current State") {
      result.sessionState = parseSessionState(content);
    }

    if (sectionName === "Recent Activity") {
      result.recentActivity = parseRecentActivity(content);
    }
  }

  return result;
}

function parseSessionState(content: string): SessionState {
  const state: SessionState = SessionStateSchema.parse({});
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- Active topic:")) {
      state.activeConversationTopic = trimmed
        .replace("- Active topic:", "")
        .trim();
    }

    if (trimmed.startsWith("- Mentioned:")) {
      state.mentionedEntities = trimmed
        .replace("- Mentioned:", "")
        .split(",")
        .map((e) => e.trim());
    }

    const turnMatch = trimmed.match(TURN_PATTERN);
    if (turnMatch?.[1]) {
      state.turnCount = Number.parseInt(turnMatch[1], 10);
    }
  }

  return state;
}

function parseRecentActivity(content: string): RecentActivity[] {
  const activities: RecentActivity[] = [];
  const lines = content.split("\n").filter((l) => l.startsWith("-"));

  for (const line of lines) {
    const trimmed = line.replace(LIST_ITEM_PREFIX, "").trim();

    let type: RecentActivity["type"] = "question";
    if (trimmed.startsWith("Searched for")) {
      type = "search";
    }
    if (trimmed.startsWith("Viewed")) {
      type = "view";
    }
    if (trimmed.startsWith("Edited")) {
      type = "edit";
    }
    if (trimmed.startsWith("Synced")) {
      type = "sync";
    }
    if (trimmed.startsWith("Asked about")) {
      type = "question";
    }

    activities.push({
      type,
      description: trimmed,
      timestamp: Date.now(),
    });
  }

  return activities;
}
