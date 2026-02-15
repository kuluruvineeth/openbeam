import { describe, expect, it } from "bun:test";
import { createMockAgent } from "../../__tests__/test-helpers";
import {
  buildSpecialistSections,
  partitionAgentsForTree,
} from "../../lib/agent-panel-layout";
import type { TimelineStateBucket } from "../../lib/timeline-state";
import { buildStateSections } from "../../lib/timeline-state";

type AgentFlatItem =
  | {
      kind: "section-header";
      key: string;
      label: string;
      description: string;
      count: number;
    }
  | {
      kind: "agent";
      agentId: string;
      depth: number;
    };

function buildFlatSpecialists(
  agents: ReturnType<typeof createMockAgent>[],
  closedSections: Set<string>
): AgentFlatItem[] {
  const { specialists } = partitionAgentsForTree(agents);
  const sections = buildSpecialistSections(specialists);
  const items: AgentFlatItem[] = [];
  for (const section of sections) {
    if (section.agents.length === 0) {
      continue;
    }
    items.push({
      kind: "section-header",
      key: section.key,
      label: section.label,
      description: section.description,
      count: section.agents.length,
    });
    if (!closedSections.has(section.key)) {
      const isSpawned = section.key === "spawned";
      for (const agent of section.agents) {
        items.push({
          kind: "agent",
          agentId: agent.agentId,
          depth: isSpawned ? (agent.spawnDepth ?? 0) : 0,
        });
      }
    }
  }
  return items;
}

type EventFlatRow = { bucket: TimelineStateBucket; id: string };

type StateFlatItem =
  | {
      kind: "header";
      bucket: TimelineStateBucket;
      count: number;
    }
  | { kind: "row"; id: string };

function buildFlatStateItems(
  rows: EventFlatRow[],
  collapsedBuckets: Set<TimelineStateBucket>
): StateFlatItem[] {
  const sections = buildStateSections(rows);
  const items: StateFlatItem[] = [];
  for (const section of sections) {
    if (section.rows.length === 0) {
      continue;
    }
    items.push({
      kind: "header",
      bucket: section.bucket,
      count: section.rows.length,
    });
    if (!collapsedBuckets.has(section.bucket)) {
      for (const row of section.rows) {
        items.push({ kind: "row", id: row.id });
      }
    }
  }
  return items;
}

describe("event feed virtual scroll flat list", () => {
  it("produces empty list for zero events", () => {
    const items = buildFlatStateItems([], new Set());
    expect(items).toEqual([]);
  });

  it("produces header + rows for a few events", () => {
    const rows: EventFlatRow[] = Array.from({ length: 5 }, (_, i) => ({
      bucket: "running_now" as const,
      id: `e-${i}`,
    }));
    const items = buildFlatStateItems(rows, new Set());

    expect(items.length).toBe(6);
    expect(items[0]).toEqual({
      kind: "header",
      bucket: "running_now",
      count: 5,
    });
    for (let i = 1; i <= 5; i++) {
      const item = items[i];
      expect(item?.kind).toBe("row");
    }
  });

  it("bounds flat list size when a section is collapsed", () => {
    const rows: EventFlatRow[] = [
      ...Array.from({ length: 200 }, (_, i) => ({
        bucket: "earlier" as const,
        id: `earlier-${i}`,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        bucket: "running_now" as const,
        id: `running-${i}`,
      })),
    ];

    const collapsed = new Set<TimelineStateBucket>(["earlier"]);
    const items = buildFlatStateItems(rows, collapsed);

    const headerCount = items.filter((i) => i.kind === "header").length;
    const rowCount = items.filter((i) => i.kind === "row").length;

    expect(headerCount).toBe(2);
    expect(rowCount).toBe(10);
  });

  it("collapse/expand toggle changes flat list count", () => {
    const rows: EventFlatRow[] = Array.from({ length: 50 }, (_, i) => ({
      bucket: "earlier" as const,
      id: `e-${i}`,
    }));

    const expanded = buildFlatStateItems(rows, new Set());
    const collapsed = buildFlatStateItems(rows, new Set(["earlier"]));

    expect(expanded.length).toBe(51);
    expect(collapsed.length).toBe(1);
  });

  it("handles 500 events with multiple buckets", () => {
    const rows: EventFlatRow[] = [
      ...Array.from({ length: 50 }, (_, i) => ({
        bucket: "running_now" as const,
        id: `run-${i}`,
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        bucket: "needs_attention" as const,
        id: `attn-${i}`,
      })),
      ...Array.from({ length: 30 }, (_, i) => ({
        bucket: "recently_completed" as const,
        id: `comp-${i}`,
      })),
      ...Array.from({ length: 400 }, (_, i) => ({
        bucket: "earlier" as const,
        id: `old-${i}`,
      })),
    ];

    const collapsedEarlier = new Set<TimelineStateBucket>(["earlier"]);
    const items = buildFlatStateItems(rows, collapsedEarlier);

    const rowCount = items.filter((i) => i.kind === "row").length;
    expect(rowCount).toBe(100);

    const allExpanded = buildFlatStateItems(rows, new Set());
    expect(allExpanded.length).toBe(500 + 4);
  });
});

describe("agent panel virtual scroll flat list", () => {
  it("produces empty flat list when no agents", () => {
    const items = buildFlatSpecialists([], new Set());
    expect(items).toEqual([]);
  });

  it("produces flat list for running agents", () => {
    const agents = Array.from({ length: 5 }, (_, i) =>
      createMockAgent({
        agentId: `a-${i}`,
        agentName: `Agent ${i}`,
        role: "researcher",
        status: "running",
      })
    );
    const items = buildFlatSpecialists(agents, new Set());
    const headers = items.filter((i) => i.kind === "section-header");
    const agentItems = items.filter((i) => i.kind === "agent");

    expect(headers.length).toBe(1);
    expect(agentItems.length).toBe(5);
  });

  it("bounds flat list when section is collapsed", () => {
    const agents = Array.from({ length: 200 }, (_, i) =>
      createMockAgent({
        agentId: `a-${i}`,
        agentName: `Agent ${i}`,
        role: "researcher",
        status: "completed",
      })
    );

    const expanded = buildFlatSpecialists(agents, new Set());
    const collapsed = buildFlatSpecialists(agents, new Set(["done"]));

    expect(expanded.filter((i) => i.kind === "agent").length).toBe(200);
    expect(collapsed.filter((i) => i.kind === "agent").length).toBe(0);
    expect(collapsed.filter((i) => i.kind === "section-header").length).toBe(1);
  });

  it("handles spawned agents with correct depth", () => {
    const agents = [
      createMockAgent({
        agentId: "parent",
        agentName: "Parent",
        role: "researcher",
        status: "running",
        spawnedBy: "coordinator",
        spawnDepth: 1,
      }),
      createMockAgent({
        agentId: "child",
        agentName: "Child",
        role: "researcher",
        status: "running",
        spawnedBy: "parent",
        spawnDepth: 2,
      }),
    ];
    const items = buildFlatSpecialists(agents, new Set());
    const agentItems = items.filter(
      (i): i is Extract<AgentFlatItem, { kind: "agent" }> => i.kind === "agent"
    );

    expect(agentItems.length).toBe(2);
    const depths = agentItems.map((a) => a.depth).sort();
    expect(depths).toEqual([1, 2]);
  });

  it("handles 200 agents across multiple sections", () => {
    const agents = [
      ...Array.from({ length: 80 }, (_, i) =>
        createMockAgent({
          agentId: `run-${i}`,
          agentName: `Runner ${i}`,
          role: "researcher",
          status: "running",
        })
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        createMockAgent({
          agentId: `block-${i}`,
          agentName: `Blocked ${i}`,
          role: "researcher",
          status: "blocked",
        })
      ),
      ...Array.from({ length: 100 }, (_, i) =>
        createMockAgent({
          agentId: `done-${i}`,
          agentName: `Done ${i}`,
          role: "researcher",
          status: "completed",
        })
      ),
    ];

    const items = buildFlatSpecialists(agents, new Set());
    const headers = items.filter((i) => i.kind === "section-header");
    const agentItems = items.filter((i) => i.kind === "agent");

    expect(headers.length).toBe(3);
    expect(agentItems.length).toBe(200);

    const collapsedDone = buildFlatSpecialists(agents, new Set(["done"]));
    expect(collapsedDone.filter((i) => i.kind === "agent").length).toBe(100);
  });

  it("excludes coordinator agents from specialist list", () => {
    const agents = [
      createMockAgent({
        agentId: "coord",
        agentName: "Coordinator",
        role: "coordinator",
        status: "running",
      }),
      createMockAgent({
        agentId: "worker",
        agentName: "Worker",
        role: "researcher",
        status: "running",
      }),
    ];
    const items = buildFlatSpecialists(agents, new Set());
    const agentItems = items.filter(
      (i): i is Extract<AgentFlatItem, { kind: "agent" }> => i.kind === "agent"
    );

    expect(agentItems.length).toBe(1);
    expect(agentItems[0]?.agentId).toBe("worker");
  });
});
