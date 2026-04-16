import type { Database } from "@openbeam/db";
import { createComputerAgent, getComputerAgentBySlug } from "@openbeam/db";

export interface CatalogAgent {
  templateId: string;
  name: string;
  slug: string;
  description: string;
  scheduleCron: string | null;
  code: string;
}

const KNOWLEDGE_DIGEST: CatalogAgent = {
  templateId: "knowledge-digest",
  name: "Knowledge Digest",
  slug: "knowledge-digest",
  description:
    "Weekly summary of new content across all connectors with trends and gaps",
  scheduleCron: "0 8 * * 1",
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify } = SecureExec.bindings;

const prevMemories = await readMemory({ key: "weekly_volume" });
let baseline = null;
if (prevMemories.length > 0) {
  try { baseline = JSON.parse(prevMemories[0].content); } catch {}
}

const trendMemories = await readMemory({ key: "weekly_trends" });
let trends = [];
if (trendMemories.length > 0) {
  try { trends = JSON.parse(trendMemories[0].content); } catch {}
}

const recentResult = await callTool("search_recent", { days: 7, limit: 50 });
const recent = parseMcp(recentResult);
const docs = recent?.data ?? [];

const thisWeek = {
  docCount: docs.length,
  sources: [...new Set(docs.map(d => d.connectorType))],
  date: new Date().toISOString().slice(0, 10),
};

const prevCount = baseline?.docCount ?? 0;
const changePercent = prevCount > 0
  ? Math.round(((thisWeek.docCount - prevCount) / prevCount) * 100)
  : 0;

const digest = await generateText(
  "Create a concise weekly knowledge digest. Include: document count vs last week, top sources, notable items.\\n\\n" +
  JSON.stringify({ thisWeek, previousWeek: baseline, changePercent, recentDocs: docs.slice(0, 10) }),
  { system: "You produce scannable summaries with bullet points." }
);

await writeMemory("weekly_volume", JSON.stringify(thisWeek), "snapshot");
const updatedTrends = [...trends, thisWeek].slice(-12);
await writeMemory("weekly_trends", JSON.stringify(updatedTrends), "trends");
await notify(digest);

module.exports = { summary: digest, docCount: thisWeek.docCount, changePercent };`,
};

const STALE_CONTENT_DETECTOR: CatalogAgent = {
  templateId: "stale-content-detector",
  name: "Stale Content Detector",
  slug: "stale-content-detector",
  description:
    "Finds outdated documents and proposes archival for content not updated in 90+ days",
  scheduleCron: "0 10 * * *",
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify, propose } = SecureExec.bindings;

const ignoreMemories = await readMemory({ key: "ignore_paths" });
let ignorePaths = [];
if (ignoreMemories.length > 0) {
  try { ignorePaths = JSON.parse(ignoreMemories[0].content); } catch {}
}

const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const staleResult = await callTool("search_documents", { query: "*", updatedBefore: cutoffDate, limit: 50 });
const stale = parseMcp(staleResult);
const staleDocs = (stale?.data ?? []).filter(doc => {
  const path = doc.sourceUri ?? doc.title ?? "";
  return !ignorePaths.some(p => path.includes(p));
});

if (staleDocs.length === 0) {
  await notify("No stale content found.");
  module.exports = { summary: "No stale content found", count: 0 };
  return;
}

const analysis = await generateText(
  "Categorize these stale documents by severity (critical, moderate, low).\\n\\n" +
  JSON.stringify(staleDocs.slice(0, 20).map(d => ({ title: d.title, source: d.connectorType, lastUpdated: d.updatedAt }))),
  { system: "You are a content auditor. Be concise." }
);

const actions = staleDocs.slice(0, 10).map(doc => ({
  tool: "context_store",
  args: { uri: doc.sourceUri, action: "archive" },
  description: "Archive: " + (doc.title ?? "untitled"),
}));

await notify("Found " + staleDocs.length + " stale document(s). Proposing archival for " + actions.length + ".");
await propose(actions);

module.exports = { summary: analysis, staleCount: staleDocs.length };`,
};

const CONNECTOR_HEALTH_MONITOR: CatalogAgent = {
  templateId: "connector-health-monitor",
  name: "Connector Health Monitor",
  slug: "connector-health-monitor",
  description:
    "Checks sync status and error rates across connectors, auto-triggers re-sync for failures",
  scheduleCron: "0 */6 * * *",
  code: `const { callTool, parseMcp, readMemory, writeMemory, notify } = SecureExec.bindings;

const baselineMemories = await readMemory({ key: "connector_stats" });
let baseline = {};
if (baselineMemories.length > 0) {
  try { baseline = JSON.parse(baselineMemories[0].content); } catch {}
}

const connectorsResult = await callTool("connector_list", {});
const connectors = parseMcp(connectorsResult);
const connectorList = connectors?.data ?? [];

const issues = [];
const stats = {};

for (const conn of connectorList) {
  const healthResult = await callTool("connector_health", { connectorId: conn.id });
  const health = parseMcp(healthResult);

  stats[conn.id] = {
    name: conn.name,
    type: conn.type,
    status: health?.status ?? "unknown",
    lastSync: health?.lastSyncAt ?? null,
    errorCount: health?.errorCount ?? 0,
  };

  const prevStats = baseline[conn.id];
  const isNewError = health?.status === "error" && prevStats?.status !== "error";
  const isSyncStale = health?.lastSyncAt &&
    (Date.now() - new Date(health.lastSyncAt).getTime()) > 12 * 60 * 60 * 1000;

  if (isNewError) {
    issues.push(conn.name + ": new error");
    try { await callTool("sync_trigger", { connectorId: conn.id }); } catch {}
  }

  if (isSyncStale) {
    issues.push(conn.name + ": sync stale (last: " + health.lastSyncAt + ")");
  }
}

await writeMemory("connector_stats", JSON.stringify(stats), "snapshot");

if (issues.length > 0) {
  await notify("Connector issues:\\n" + issues.map(i => "- " + i).join("\\n"), "urgent");
} else {
  await notify("All " + connectorList.length + " connectors healthy.");
}

module.exports = { connectorCount: connectorList.length, issueCount: issues.length };`,
};

const SEARCH_QUALITY_ANALYST: CatalogAgent = {
  templateId: "search-quality-analyst",
  name: "Search Quality Analyst",
  slug: "search-quality-analyst",
  description:
    "Analyzes search queries with poor results and identifies content gaps",
  scheduleCron: "0 15 * * 5",
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify } = SecureExec.bindings;

const baselineMemories = await readMemory({ key: "search_metrics" });
let prevMetrics = null;
if (baselineMemories.length > 0) {
  try { prevMetrics = JSON.parse(baselineMemories[0].content); } catch {}
}

const gapMemories = await readMemory({ key: "known_gaps" });
let knownGaps = [];
if (gapMemories.length > 0) {
  try { knownGaps = JSON.parse(gapMemories[0].content); } catch {}
}

const analyticsResult = await callTool("search_documents", { query: "*", limit: 50 });
const analytics = parseMcp(analyticsResult);

const thisWeek = {
  totalResults: (analytics?.data ?? []).length,
  date: new Date().toISOString().slice(0, 10),
};

const analysis = await generateText(
  "Analyze search quality metrics. Identify content gaps and recommendations.\\n\\n" +
  JSON.stringify({ thisWeek, previousWeek: prevMetrics, knownGaps }),
  { system: "You are a search quality analyst. Focus on actionable recommendations." }
);

await writeMemory("search_metrics", JSON.stringify(thisWeek), "snapshot");
await notify(analysis);

module.exports = { summary: analysis };`,
};

const ONBOARDING_CURATOR: CatalogAgent = {
  templateId: "onboarding-curator",
  name: "Onboarding Curator",
  slug: "onboarding-curator",
  description:
    "Creates personalized reading lists for new team members based on role",
  scheduleCron: null,
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify, getTrigger } = SecureExec.bindings;

const trigger = getTrigger();
const role = trigger?.payload?.role ?? "general";

const docsResult = await callTool("search_documents", { query: role + " onboarding guide handbook", limit: 30 });
const docs = parseMcp(docsResult);
const topDocs = docs?.data ?? [];

const expertsResult = await callTool("search_people", { query: role, limit: 5 });
const experts = parseMcp(expertsResult);
const topExperts = experts?.data ?? [];

const readingList = await generateText(
  "Create a progressive onboarding reading list for a new " + role + " team member.\\n" +
  "Organize into: Day 1 (3-5 essentials), Week 1 (10-15 key docs), Month 1 (deep dives).\\n\\n" +
  JSON.stringify({ documents: topDocs, experts: topExperts }),
  { system: "You create scannable onboarding guides with bullet points." }
);

const pathMemories = await readMemory({ key: "onboarding_paths" });
let knownPaths = {};
if (pathMemories.length > 0) {
  try { knownPaths = JSON.parse(pathMemories[0].content); } catch {}
}
knownPaths[role] = { lastGenerated: new Date().toISOString(), docCount: topDocs.length };
await writeMemory("onboarding_paths", JSON.stringify(knownPaths), "tracker");

await notify("Onboarding guide for " + role + ":\\n\\n" + readingList);

module.exports = { summary: readingList, role, docCount: topDocs.length };`,
};

const COMPLIANCE_WATCHDOG: CatalogAgent = {
  templateId: "compliance-watchdog",
  name: "Compliance Watchdog",
  slug: "compliance-watchdog",
  description:
    "Scans for sensitive data exposure and proposes remediation for critical findings",
  scheduleCron: "0 6 * * *",
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify, propose } = SecureExec.bindings;

const knownMemories = await readMemory({ key: "sensitive_docs" });
let knownSensitive = [];
if (knownMemories.length > 0) {
  try { knownSensitive = JSON.parse(knownMemories[0].content); } catch {}
}
const knownIds = new Set(knownSensitive.map(d => d.id));

const exclusionMemories = await readMemory({ key: "exclusions" });
let exclusions = [];
if (exclusionMemories.length > 0) {
  try { exclusions = JSON.parse(exclusionMemories[0].content); } catch {}
}

const patterns = ["password", "api_key", "secret", "token", "credential"];
const findings = [];

for (const pattern of patterns) {
  const result = await callTool("search_documents", { query: pattern, limit: 10 });
  const matches = parseMcp(result);
  for (const doc of (matches?.data ?? [])) {
    const docId = doc.id ?? doc.sourceUri;
    if (!knownIds.has(docId) && !exclusions.includes(docId)) {
      findings.push({ id: docId, title: doc.title, source: doc.connectorType, pattern });
    }
  }
}

if (findings.length === 0) {
  await notify("Compliance scan complete. No new findings.");
  module.exports = { summary: "No new findings", count: 0 };
  return;
}

const critical = findings.filter(f => ["password", "api_key", "secret", "credential"].includes(f.pattern));
const actions = critical.slice(0, 5).map(f => ({
  tool: "context_store",
  args: { uri: f.id, action: "restrict_access" },
  description: "Restrict access: " + f.title + " (contains " + f.pattern + ")",
}));

const updatedKnown = [...knownSensitive, ...findings].slice(-200);
await writeMemory("sensitive_docs", JSON.stringify(updatedKnown), "tracker");
await notify("Compliance scan: " + findings.length + " finding(s). " + critical.length + " critical.", critical.length > 0 ? "urgent" : "normal");

if (actions.length > 0) {
  await propose(actions);
}

module.exports = { totalFindings: findings.length, criticalCount: critical.length };`,
};

export const CATALOG_AGENTS: CatalogAgent[] = [
  KNOWLEDGE_DIGEST,
  STALE_CONTENT_DETECTOR,
  CONNECTOR_HEALTH_MONITOR,
  SEARCH_QUALITY_ANALYST,
  ONBOARDING_CURATOR,
  COMPLIANCE_WATCHDOG,
];

export async function seedPreBuiltAgents(
  db: Database,
  teamId: string
): Promise<number> {
  let seeded = 0;

  for (const agent of CATALOG_AGENTS) {
    const existing = await getComputerAgentBySlug(db, teamId, agent.slug);
    if (!existing) {
      await createComputerAgent(db, {
        teamId,
        name: agent.name,
        slug: agent.slug,
        description: agent.description,
        source: "CATALOG",
        code: agent.code,
        templateId: agent.templateId,
        scheduleCron: agent.scheduleCron,
        status: "DRAFT",
      });
      seeded += 1;
    }
  }

  return seeded;
}
