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
const errors = [];

let baseline = null;
try {
  const prevMemories = await readMemory({ key: "weekly_volume" });
  if (prevMemories.length > 0) { try { baseline = JSON.parse(prevMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory(weekly_volume): " + e.message); }

let trends = [];
try {
  const trendMemories = await readMemory({ key: "weekly_trends" });
  if (trendMemories.length > 0) { try { trends = JSON.parse(trendMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory(weekly_trends): " + e.message); }

let docs = [];
try {
  const recentResult = await callTool("search_recent", { days: 7, limit: 50 });
  const recent = parseMcp(recentResult);
  docs = recent?.data ?? [];
} catch (e) { errors.push("search_recent: " + e.message); }

if (docs.length === 0 && errors.length === 0) {
  module.exports = { summary: "No new content this week", docCount: 0 };
  return;
}

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
  "Create a concise weekly knowledge digest. Include: document count vs last week, top sources, notable items." +
  (errors.length > 0 ? " Note: some data sources had errors: " + errors.join("; ") : "") +
  "\\n\\n" + JSON.stringify({ thisWeek, previousWeek: baseline, changePercent, recentDocs: docs.slice(0, 10) }),
  { system: "You produce scannable summaries with bullet points." }
);

try { await writeMemory("weekly_volume", JSON.stringify(thisWeek), "snapshot"); } catch {}
const updatedTrends = [...trends, thisWeek].slice(-12);
try { await writeMemory("weekly_trends", JSON.stringify(updatedTrends), "trends"); } catch {}
await notify(digest);

module.exports = { summary: digest, docCount: thisWeek.docCount, changePercent, errors };`,
};

const STALE_CONTENT_DETECTOR: CatalogAgent = {
  templateId: "stale-content-detector",
  name: "Stale Content Detector",
  slug: "stale-content-detector",
  description:
    "Finds outdated documents and proposes archival for content not updated in 90+ days",
  scheduleCron: "0 10 * * *",
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify, propose } = SecureExec.bindings;
const errors = [];

let ignorePaths = [];
try {
  const ignoreMemories = await readMemory({ key: "ignore_paths" });
  if (ignoreMemories.length > 0) { try { ignorePaths = JSON.parse(ignoreMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory(ignore_paths): " + e.message); }

const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
let staleDocs = [];
try {
  const staleResult = await callTool("search_documents", { query: "*", updatedBefore: cutoffDate, limit: 50 });
  const stale = parseMcp(staleResult);
  const seenIds = new Set();
  for (const doc of (stale?.data ?? [])) {
    const docId = doc.id ?? doc.sourceUri ?? doc.title;
    const path = doc.sourceUri ?? doc.title ?? "";
    if (seenIds.has(docId) || ignorePaths.some(p => path.includes(p))) continue;
    seenIds.add(docId);
    staleDocs.push(doc);
  }
} catch (e) { errors.push("search_documents: " + e.message); }

if (staleDocs.length === 0) {
  if (errors.length > 0) {
    await notify("Stale content scan had errors: " + errors.join("; "), "urgent");
  }
  module.exports = { summary: "No stale content found", count: 0, errors };
  return;
}

let analysis = "";
try {
  analysis = await generateText(
    "Categorize these stale documents by severity (critical, moderate, low).\\n\\n" +
    JSON.stringify(staleDocs.slice(0, 20).map(d => ({ title: d.title, source: d.connectorType, lastUpdated: d.updatedAt }))),
    { system: "You are a content auditor. Be concise." }
  );
} catch (e) { errors.push("generateText: " + e.message); analysis = staleDocs.length + " stale documents found."; }

const actions = staleDocs.slice(0, 10).map(doc => ({
  tool: "context_store",
  args: { uri: doc.sourceUri, action: "archive" },
  description: "Archive: " + (doc.title ?? "untitled"),
}));

await notify("Found " + staleDocs.length + " stale document(s). Proposing archival for " + actions.length + ".");
await propose(actions);

module.exports = { summary: analysis, staleCount: staleDocs.length, errors };`,
};

const CONNECTOR_HEALTH_MONITOR: CatalogAgent = {
  templateId: "connector-health-monitor",
  name: "Connector Health Monitor",
  slug: "connector-health-monitor",
  description:
    "Checks sync status and error rates across connectors, auto-triggers re-sync for failures",
  scheduleCron: "0 */6 * * *",
  code: `const { callTool, parseMcp, readMemory, writeMemory, notify } = SecureExec.bindings;
const errors = [];

let baseline = {};
try {
  const baselineMemories = await readMemory({ key: "connector_stats" });
  if (baselineMemories.length > 0) { try { baseline = JSON.parse(baselineMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory: " + e.message); }

let connectorList = [];
try {
  const connectorsResult = await callTool("connector_list", {});
  const connectors = parseMcp(connectorsResult);
  connectorList = connectors?.data ?? [];
} catch (e) { errors.push("connector_list: " + e.message); }

if (connectorList.length === 0) {
  if (errors.length > 0) {
    await notify("Connector health check failed: " + errors.join("; "), "urgent");
  }
  module.exports = { connectorCount: 0, issueCount: 0, errors };
  return;
}

const issues = [];
const stats = {};
const seenIds = new Set();

for (const conn of connectorList) {
  if (seenIds.has(conn.id)) continue;
  seenIds.add(conn.id);

  let health = null;
  try {
    const healthResult = await callTool("connector_health", { connectorId: conn.id });
    health = parseMcp(healthResult);
  } catch (e) {
    errors.push("connector_health(" + conn.name + "): " + e.message);
    continue;
  }

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

try { await writeMemory("connector_stats", JSON.stringify(stats), "snapshot"); } catch {}

if (issues.length > 0) {
  await notify("Connector issues:\\n" + issues.map(i => "- " + i).join("\\n"), "urgent");
} else if (errors.length > 0) {
  await notify("Connectors mostly healthy (" + connectorList.length + ") but " + errors.length + " check(s) failed.");
}

module.exports = { connectorCount: connectorList.length, issueCount: issues.length, errors };`,
};

const SEARCH_QUALITY_ANALYST: CatalogAgent = {
  templateId: "search-quality-analyst",
  name: "Search Quality Analyst",
  slug: "search-quality-analyst",
  description:
    "Analyzes search queries with poor results and identifies content gaps",
  scheduleCron: "0 15 * * 5",
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify } = SecureExec.bindings;
const errors = [];

let prevMetrics = null;
try {
  const baselineMemories = await readMemory({ key: "search_metrics" });
  if (baselineMemories.length > 0) { try { prevMetrics = JSON.parse(baselineMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory(search_metrics): " + e.message); }

let knownGaps = [];
try {
  const gapMemories = await readMemory({ key: "known_gaps" });
  if (gapMemories.length > 0) { try { knownGaps = JSON.parse(gapMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory(known_gaps): " + e.message); }

let resultCount = 0;
try {
  const analyticsResult = await callTool("search_documents", { query: "*", limit: 50 });
  const analytics = parseMcp(analyticsResult);
  resultCount = (analytics?.data ?? []).length;
} catch (e) { errors.push("search_documents: " + e.message); }

const thisWeek = {
  totalResults: resultCount,
  date: new Date().toISOString().slice(0, 10),
};

const prevResults = prevMetrics?.totalResults ?? 0;
const hasChange = Math.abs(resultCount - prevResults) > 5;

if (!hasChange && errors.length === 0) {
  try { await writeMemory("search_metrics", JSON.stringify(thisWeek), "snapshot"); } catch {}
  module.exports = { summary: "Search quality stable", totalResults: resultCount };
  return;
}

let analysis = "";
try {
  analysis = await generateText(
    "Analyze search quality metrics. Identify content gaps and recommendations.\\n\\n" +
    JSON.stringify({ thisWeek, previousWeek: prevMetrics, knownGaps, errors }),
    { system: "You are a search quality analyst. Focus on actionable recommendations." }
  );
} catch (e) { errors.push("generateText: " + e.message); analysis = "Search quality report unavailable."; }

try { await writeMemory("search_metrics", JSON.stringify(thisWeek), "snapshot"); } catch {}
await notify(analysis);

module.exports = { summary: analysis, errors };`,
};

const ONBOARDING_CURATOR: CatalogAgent = {
  templateId: "onboarding-curator",
  name: "Onboarding Curator",
  slug: "onboarding-curator",
  description:
    "Creates personalized reading lists for new team members based on role",
  scheduleCron: null,
  code: `const { callTool, parseMcp, generateText, readMemory, writeMemory, notify, getTrigger } = SecureExec.bindings;
const errors = [];

const trigger = getTrigger();
const role = trigger?.payload?.role ?? "general";

let topDocs = [];
try {
  const docsResult = await callTool("search_documents", { query: role + " onboarding guide handbook", limit: 30 });
  const docs = parseMcp(docsResult);
  topDocs = docs?.data ?? [];
} catch (e) { errors.push("search_documents: " + e.message); }

let topExperts = [];
try {
  const expertsResult = await callTool("search_people", { query: role, limit: 5 });
  const experts = parseMcp(expertsResult);
  topExperts = experts?.data ?? [];
} catch (e) { errors.push("search_people: " + e.message); }

if (topDocs.length === 0 && topExperts.length === 0) {
  await notify("No onboarding content found for role: " + role + ". Consider adding documentation.");
  module.exports = { summary: "No content found", role, docCount: 0, errors };
  return;
}

let readingList = "";
try {
  readingList = await generateText(
    "Create a progressive onboarding reading list for a new " + role + " team member.\\n" +
    "Organize into: Day 1 (3-5 essentials), Week 1 (10-15 key docs), Month 1 (deep dives).\\n\\n" +
    JSON.stringify({ documents: topDocs, experts: topExperts }),
    { system: "You create scannable onboarding guides with bullet points." }
  );
} catch (e) { errors.push("generateText: " + e.message); readingList = "Onboarding guide generation failed."; }

try {
  const pathMemories = await readMemory({ key: "onboarding_paths" });
  let knownPaths = {};
  if (pathMemories.length > 0) { try { knownPaths = JSON.parse(pathMemories[0].content); } catch {} }
  knownPaths[role] = { lastGenerated: new Date().toISOString(), docCount: topDocs.length };
  await writeMemory("onboarding_paths", JSON.stringify(knownPaths), "tracker");
} catch {}

await notify("Onboarding guide for " + role + ":\\n\\n" + readingList);

module.exports = { summary: readingList, role, docCount: topDocs.length, errors };`,
};

const COMPLIANCE_WATCHDOG: CatalogAgent = {
  templateId: "compliance-watchdog",
  name: "Compliance Watchdog",
  slug: "compliance-watchdog",
  description:
    "Scans for sensitive data exposure and proposes remediation for critical findings",
  scheduleCron: "0 6 * * *",
  code: `const { callTool, parseMcp, readMemory, writeMemory, notify, propose } = SecureExec.bindings;
const errors = [];

let knownSensitive = [];
try {
  const knownMemories = await readMemory({ key: "sensitive_docs" });
  if (knownMemories.length > 0) { try { knownSensitive = JSON.parse(knownMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory(sensitive_docs): " + e.message); }
const knownIds = new Set(knownSensitive.map(d => d.id));

let exclusions = [];
try {
  const exclusionMemories = await readMemory({ key: "exclusions" });
  if (exclusionMemories.length > 0) { try { exclusions = JSON.parse(exclusionMemories[0].content); } catch {} }
} catch (e) { errors.push("readMemory(exclusions): " + e.message); }

const patterns = ["password", "api_key", "secret", "token", "credential"];
const findings = [];
const seenIds = new Set();

for (const pattern of patterns) {
  try {
    const result = await callTool("search_documents", { query: pattern, limit: 10 });
    const matches = parseMcp(result);
    for (const doc of (matches?.data ?? [])) {
      const docId = doc.id ?? doc.sourceUri;
      if (seenIds.has(docId) || knownIds.has(docId) || exclusions.includes(docId)) continue;
      seenIds.add(docId);
      findings.push({ id: docId, title: doc.title, source: doc.connectorType, pattern });
    }
  } catch (e) { errors.push("search(" + pattern + "): " + e.message); }
}

if (findings.length === 0) {
  if (errors.length > 0) {
    await notify("Compliance scan completed with " + errors.length + " error(s): " + errors.join("; "));
  }
  module.exports = { summary: "No new findings", count: 0, errors };
  return;
}

const critical = findings.filter(f => ["password", "api_key", "secret", "credential"].includes(f.pattern));
const actions = critical.slice(0, 5).map(f => ({
  tool: "context_store",
  args: { uri: f.id, action: "restrict_access" },
  description: "Restrict access: " + f.title + " (contains " + f.pattern + ")",
}));

const updatedKnown = [...knownSensitive, ...findings].slice(-200);
try { await writeMemory("sensitive_docs", JSON.stringify(updatedKnown), "tracker"); } catch {}
await notify("Compliance scan: " + findings.length + " finding(s). " + critical.length + " critical.", critical.length > 0 ? "urgent" : "normal");

if (actions.length > 0) {
  await propose(actions);
}

module.exports = { totalFindings: findings.length, criticalCount: critical.length, errors };`,
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
