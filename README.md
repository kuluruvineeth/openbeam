<div align="center">

<a href="https://openbeam.work">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/website/public/logo_dark.png">
    <img alt="OpenBeam" src="apps/website/public/logo.png" width="72" />
  </picture>
</a>

<h1>OpenBeam</h1>

<p>
  <strong>The open-source enterprise search and AI agent platform —<br/>an alternative to Glean for SaaS <em>and</em> the physical world.</strong>
</p>

<p>
  <a href="https://openbeam.work">Website</a> ·
  <a href="https://docs.openbeam.work">Docs</a> ·
  <a href="https://github.com/kuluruvineeth/openbeam/releases/latest">Releases</a> ·
  <a href="https://github.com/kuluruvineeth/openbeam/issues">Issues</a> ·
  <a href="https://x.com/kuluruvineeth">Twitter</a>
</p>

<p>
  <a href="https://github.com/kuluruvineeth/openbeam/blob/dev/LICENSE"><img src="https://img.shields.io/badge/license-AGPL_3.0-blue.svg" alt="License: AGPL v3" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam"><img src="https://img.shields.io/github/stars/kuluruvineeth/openbeam?style=flat&label=stars&color=yellow" alt="GitHub stars" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/releases/latest"><img src="https://img.shields.io/github/v/release/kuluruvineeth/openbeam?label=release&color=green" alt="Latest release" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/pkgs/container/openbeam-cli"><img src="https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker" alt="Docker" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/commits/dev"><img src="https://img.shields.io/github/last-commit/kuluruvineeth/openbeam" alt="Last commit" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/graphs/contributors"><img src="https://img.shields.io/github/contributors/kuluruvineeth/openbeam" alt="Contributors" /></a>
</p>

<br />

<img src="apps/website/public/hero-screenshot.png" alt="OpenBeam — enterprise search across SaaS and IoT" width="92%" />

</div>

<br />

Enterprise knowledge is trapped in silos. Slack, GitHub, Notion, Gmail don't talk to each other — and none of them talk to the IoT sensors, industrial controllers, and camera feeds that run the physical side of your business. **OpenBeam unifies all of it into one searchable, agent-ready layer.** One query across sensors and SaaS. Grounded answers in 200ms. Runs on your servers.

Glean proved the digital half at a $7.2B valuation. Nobody has built the physical half. We're building both — in the open.

<br />

## Build an autonomous agent across your entire company in 15 lines

```typescript
import OpenBeam from "@openbeam/sdk";

const ob = new OpenBeam({ apiKey: process.env.OPENBEAM_API_KEY! });

const { data } = await ob.agents.ask(
  "What did the team decide about pricing for Q2?",
  { connectorTypes: ["SLACK", "NOTION", "LINEAR"], maxSources: 5 }
);

console.log(data.answer);
//  "The team aligned on a 12% increase for enterprise tiers, effective May 1.
//   Self-serve pricing stays flat. Decision finalized in the Apr 18 pricing sync."

console.log(data.citations);
//  [
//    { title: "Q2 Pricing Decision",  source: "Notion",  uri: "...", snippet: "..." },
//    { title: "#pricing-sync thread", source: "Slack",   uri: "...", snippet: "..." },
//    { title: "ENG-2174 Pricing API", source: "Linear",  uri: "...", snippet: "..." }
//  ]
```

Hybrid retrieval across 87 connectors. RAG-grounded. Citations for every claim. No vector DB to manage, no prompt engineering to write.

**Same answer, from your terminal:**

```bash
openbeam search query "Q2 pricing decision" --connectors SLACK,NOTION,LINEAR
```

<br />

## Install

| Platform | Command |
|---|---|
| **macOS** (Homebrew) | `brew install kuluruvineeth/tap/openbeam` |
| **Linux / macOS** (curl) | `curl -fsSL https://raw.githubusercontent.com/kuluruvineeth/openbeam/dev/apps/cli/scripts/install.sh \| bash` |
| **Windows** (Scoop) | `scoop bucket add openbeam https://github.com/kuluruvineeth/scoop-bucket; scoop install openbeam` |
| **Docker** | `docker run --rm ghcr.io/kuluruvineeth/openbeam-cli:latest version` |
| **Direct** | [Latest release →](https://github.com/kuluruvineeth/openbeam/releases/latest) (.tar.gz, .deb, .rpm, .apk, Arch, .zip) |

Every release is signed with [cosign](https://docs.sigstore.dev/cosign/) (keyless OIDC) and carries a [SLSA Level 3](https://slsa.dev/spec/v1.0/levels#build-l3) build provenance attestation. Verify with `gh attestation verify`.

**From zero to your first grounded answer in 3 commands:**

```bash
openbeam auth login --api-key op_live_xxx
openbeam search query "quarterly revenue across all teams"
openbeam computer run knowledge-digest --wait
```

<br />

## Features

- **🔍 Agentic RAG** — Hybrid semantic + keyword search across all connected sources via [Vespa](https://vespa.ai). Sub-200ms p99. Permission-aware: users only see what they're authorized to see, enforced at the index level.
- **🤖 Computer** — Autonomous AI agents with cron schedules, durable [Temporal](https://temporal.io) execution, approval gating, and persistent memory. Six pre-built agents shipped today; custom agents emerge from prompts.
- **🔌 87 Connectors** — Across SaaS, IoT, and industrial protocols. Real production connectors with OAuth refresh, incremental sync, webhooks, and rate limiting — not API stubs.
- **🧠 Context Database** — Hierarchical L0/L1/L2 context layer (inspired by ByteDance's OpenViking) with session memory and auto-extraction. 80–96% token reduction vs flat RAG.
- **🛠️ MCP Server, first-class** — Built-in Model Context Protocol server. Claude Desktop, Cursor, Codex, and any MCP-compatible client get the full OpenBeam tool surface.
- **📦 Multi-surface** — Web, CLI, mobile, desktop, browser extension, voice, MCP. Same index, same permissions, same agents — every surface.
- **🛡️ Supply-chain security** — Cosign keyless signing, SLSA L3 attestations, SBOMs, signed Docker images on `ghcr.io`. Verify any release before you trust it.
- **🌐 Edge-ready** — Pure-TypeScript edge stack (`@openplane/edge-core`, `edge-search`, `edge-ai`) with bun:sqlite WAL + FTS5 + vector hybrid + BLAKE3 Merkle sync + on-device RAG. Deploy without round-tripping the cloud.

<br />

## How we compare

We benchmark against the best — [Glean](https://glean.com) (proprietary leader, $7.2B valuation), [Onyx](https://onyx.app) (closest open-source peer), and [Atlassian Rovo](https://www.atlassian.com/software/rovo) (the incumbent most teams already pay for). Verify any row yourself.

| | **OpenBeam** | **Glean** | **Onyx** | **Confluence + Rovo** |
|---|---|---|---|---|
| License | AGPL-3.0 | Proprietary | MIT | Proprietary |
| Self-hosted | ✅ | ❌ cloud only | ✅ | ✅ Data Center ($$$) |
| Pricing entry | Free, no sales call | Sales call, ~$50K+ | Free OSS / paid Pro | Bundled in Standard+ tier |
| Connector count | **87** | 100+ | 50+ | ~15 native |
| IoT + industrial data | ✅ MQTT, OPC-UA, BACnet, AWS IoT, Verkada, Samsara | ❌ | ❌ | ❌ |
| Hybrid search engine | Vespa (BM25 + HNSW) | Proprietary | Vespa | Lucene |
| Sub-200ms p99 search | ✅ | ✅ claimed | ✅ claimed | ⚠️ varies |
| Autonomous AI agents | ✅ Computer (6 pre-built + custom) | ⚠️ limited | ⚠️ limited | ⚠️ Rovo agents (beta) |
| MCP server (Claude/Cursor) | ✅ first-class | ❌ | ⚠️ supported | ❌ |
| CLI | ✅ Go, signed binary, 5 install paths | ❌ | ⚠️ install script only | ❌ |
| TypeScript SDK | ✅ `@openbeam/sdk` | REST only | REST only | REST only |
| Edge / offline deployment | ✅ pure-TS edge stack with offline RAG | ❌ | ❌ | ❌ |
| Permission-aware search | ✅ | ✅ | ✅ | ✅ |
| SOC 2 / enterprise security | ⚠️ in progress (audit yourself, AGPL) | ✅ | ⚠️ paid tier | ✅ |
| Vendor lock-in | None — own your data | High | Low | High |

<sub>Last verified 2026-05-04. PRs welcome to keep this honest.</sub>

<br />

## Computer — autonomous agents that work while you don't

Six pre-built agents, ready to run on a schedule:

| Agent | What it does |
|---|---|
| **Knowledge Digest** | Weekly summary of new content across all your sources |
| **Stale Content Detector** | Flags docs older than 90 days for archival or refresh |
| **Connector Health** | Watches sync failures and re-auths expiring tokens before they break |
| **Search Quality** | Audits failed queries weekly, proposes connector + index fixes |
| **Onboarding Curator** | Generates personalized reading lists for new hires |
| **Compliance Watchdog** | Alerts when documents contain exposed credentials or PII |

Each runs on a cron schedule, surfaces proposals (write actions need explicit approval), keeps memory across runs, and notifies via Slack, email, or webhook. Trigger from the dashboard, the chat, the CLI, or via MCP from Claude Code:

```bash
openbeam computer enable knowledge-digest --schedule "0 9 * * MON"
openbeam computer run knowledge-digest --wait
openbeam computer approve <run-id> --actions "archive,notify"
```

[Browse the agent catalog →](https://openbeam.work/computer)

<br />

## Connectors

**OpenBeam ships with 87 connectors today.** OpenBeam is the only open-source enterprise search platform that indexes physical-world data alongside SaaS — IoT fleets, smart devices, and edge sensors are first-class data sources, not an afterthought.

<table>
<tr><th colspan="5" align="left">Productivity & Docs</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/notion" width="14" /> Notion</td>
  <td><img src="https://cdn.simpleicons.org/confluence" width="14" /> Confluence</td>
  <td>Coda</td>
  <td><img src="https://cdn.simpleicons.org/evernote" width="14" /> Evernote</td>
  <td><img src="https://cdn.simpleicons.org/airtable" width="14" /> Airtable</td>
</tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/smartsheet" width="14" /> Smartsheet</td>
  <td>Google Sites</td>
  <td><img src="https://cdn.simpleicons.org/microsoftonenote" width="14" /> OneNote</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Communication</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/slack" width="14" /> Slack</td>
  <td><img src="https://cdn.simpleicons.org/microsoftteams" width="14" /> Teams</td>
  <td><img src="https://cdn.simpleicons.org/gmail" width="14" /> Gmail</td>
  <td>Google Chat</td>
  <td><img src="https://cdn.simpleicons.org/microsoftoutlook" width="14" /> Outlook</td>
</tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/intercom" width="14" /> Intercom</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Project Management</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/linear" width="14" /> Linear</td>
  <td><img src="https://cdn.simpleicons.org/jira" width="14" /> Jira</td>
  <td><img src="https://cdn.simpleicons.org/asana" width="14" /> Asana</td>
  <td><img src="https://cdn.simpleicons.org/clickup" width="14" /> ClickUp</td>
  <td>Monday</td>
</tr>
<tr>
  <td>Aha!</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Code & DevOps</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/github" width="14" /> GitHub</td>
  <td><img src="https://cdn.simpleicons.org/gitlab" width="14" /> GitLab</td>
  <td><img src="https://cdn.simpleicons.org/bitbucket" width="14" /> Bitbucket</td>
  <td><img src="https://cdn.simpleicons.org/jenkins" width="14" /> Jenkins</td>
  <td>Azure DevOps</td>
</tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/jfrog" width="14" /> JFrog</td>
  <td>Phabricator</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">CRM & Sales</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/salesforce" width="14" /> Salesforce</td>
  <td><img src="https://cdn.simpleicons.org/hubspot" width="14" /> HubSpot</td>
  <td><img src="https://cdn.simpleicons.org/pipedrive" width="14" /> Pipedrive</td>
  <td><img src="https://cdn.simpleicons.org/zendesk" width="14" /> Zendesk</td>
  <td>Gong</td>
</tr>
<tr>
  <td>Dynamics 365</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Storage & Files</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/googledrive" width="14" /> Google Drive</td>
  <td><img src="https://cdn.simpleicons.org/dropbox" width="14" /> Dropbox</td>
  <td><img src="https://cdn.simpleicons.org/box" width="14" /> Box</td>
  <td>Egnyte</td>
  <td><img src="https://cdn.simpleicons.org/amazons3" width="14" /> AWS S3</td>
</tr>
<tr>
  <td>SharePoint</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Calendar & Meetings</th></tr>
<tr>
  <td>Google Calendar</td>
  <td>Microsoft Calendar</td>
  <td><img src="https://cdn.simpleicons.org/zoom" width="14" /> Zoom</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Design & Whiteboard</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/figma" width="14" /> Figma</td>
  <td><img src="https://cdn.simpleicons.org/canva" width="14" /> Canva</td>
  <td><img src="https://cdn.simpleicons.org/miro" width="14" /> Miro</td>
  <td>Lucid</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Engineering & Observability</th></tr>
<tr>
  <td><img src="https://cdn.simpleicons.org/datadog" width="14" /> Datadog</td>
  <td>OpsGenie</td>
  <td>PagerDuty</td>
  <td>Freshservice</td>
  <td>ServiceNow</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Sales Enablement</th></tr>
<tr>
  <td>Highspot</td>
  <td>Showpad</td>
  <td>Seismic</td>
  <td>Mindtickle</td>
  <td>Klue</td>
</tr>
<tr>
  <td>Loopio</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">HR, Finance & Legal</th></tr>
<tr>
  <td>BambooHR</td>
  <td>Greenhouse</td>
  <td>Workday</td>
  <td>Lessonly</td>
  <td>15Five</td>
</tr>
<tr>
  <td>Harvest</td>
  <td>NetSuite</td>
  <td>Coupa</td>
  <td><img src="https://cdn.simpleicons.org/docusign" width="14" /> DocuSign</td>
  <td>Ironclad</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Knowledge Bases & Comms</th></tr>
<tr>
  <td>Guru</td>
  <td>MindTouch</td>
  <td>Simpplr</td>
  <td>LumApps</td>
  <td>Haystack</td>
</tr>
<tr>
  <td>Panopto</td>
  <td>Docebo</td>
  <td>Insided</td>
  <td>Fellow</td>
  <td>Interact</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">Marketing, Analytics & Other</th></tr>
<tr>
  <td>Marketo</td>
  <td><img src="https://cdn.simpleicons.org/amplitude" width="14" /> Amplitude</td>
  <td>Bynder</td>
  <td>Looker Studio</td>
  <td>Procore</td>
</tr>
<tr>
  <td>Benchling</td>
  <td>NICE CXOne</td>
  <td>—</td>
  <td>—</td>
  <td>—</td>
</tr>
</table>

<table>
<tr><th colspan="5" align="left">IoT & Physical World — only OSS doing this</th></tr>
<tr>
  <td>Samsara</td>
  <td>Verkada</td>
  <td>AWS IoT Core</td>
  <td>SmartThings</td>
  <td>—</td>
</tr>
</table>

<sub>Industrial protocols (MQTT, OPC-UA, BACnet, ThingsBoard, Node-RED) ship as a separate gateway app — see <a href="./apps/iot-gateway"><code>apps/iot-gateway</code></a>.</sub>

[See full connector list with auth, sync, and webhook support →](https://docs.openbeam.work/connectors)

<br />

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Surfaces:  Web · CLI · Mobile · Desktop · Browser ext · MCP    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ tRPC + REST (Hono)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Server (apps/server) ─► Temporal workflows ─► Vercel AI SDK    │
│     │                          │                                │
│     ▼                          ▼                                │
│  PostgreSQL                Computer agents (cron, signals)      │
│  Redis                                                           │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vespa (BM25 + HNSW hybrid search, sub-200ms p99)               │
└─────────────────────────────────────────────────────────────────┘
                               ▲
                               │ Connector sync (Temporal)
                               │
┌─────────────────────────────────────────────────────────────────┐
│  87 connectors  ·  IoT gateway  ·  Industrial protocols         │
└─────────────────────────────────────────────────────────────────┘
```

Editable Excalidraw diagrams: [system context](apps/docs/public/diagrams/excalidraw/system-context.excalidraw) · [ER schema](apps/docs/public/diagrams/excalidraw/er-diagram.excalidraw) · [sync flow](apps/docs/public/diagrams/excalidraw/flow-connector-sync.excalidraw) · [search flow](apps/docs/public/diagrams/excalidraw/flow-search-request.excalidraw) · [deployment topology](apps/docs/public/diagrams/excalidraw/deployment-topology.excalidraw)

<br />

## Tech stack

[**TypeScript**](https://www.typescriptlang.org) · [**Bun 1.3**](https://bun.com) · [**Next.js 16**](https://nextjs.org) · [**React 19**](https://react.dev) · [**Hono**](https://hono.dev) · [**tRPC 11**](https://trpc.io) · [**Prisma**](https://www.prisma.io) + [**PostgreSQL**](https://www.postgresql.org) · [**Redis**](https://redis.io) · [**Vespa**](https://vespa.ai) · [**Temporal**](https://temporal.io) · [**Vercel AI SDK**](https://sdk.vercel.ai) · [**Better Auth**](https://www.better-auth.com) · [**Tailwind 4**](https://tailwindcss.com) · [**Go + Cobra**](https://github.com/spf13/cobra) (CLI) · [**GoReleaser**](https://goreleaser.com) · [**Helm**](https://helm.sh) + [**Terraform**](https://www.terraform.io) (infra) · [**Remotion**](https://www.remotion.dev) (changelog videos)

<br />

## Roadmap

We ship in public.

| Quarter | Theme | Headline |
|---|---|---|
| **Q2 2026** ⏳ in flight | Production stability, autonomous agents | Computer (6 agents shipped) · CLI v1 (brew/scoop/winget/curl/Docker + cosign + SLSA L3) · Context DB Phase 5 wiring · close 29 missing connector lookup actions · `@openbeam/sdk` npm publish |
| **Q3 2026** 📋 planned | Physical AI integration | Matterport, FHIR, Viam, NVIDIA Omniverse, Apple Vision Pro · Robot Knowledge API · 7 spatial agent tools · PHI de-identification |
| **Q4 2026** 📋 planned | Vertical depth + surfaces | AgroBeam (farm data platform, 8 phase plans) · spatial editor + viewer · browser extension polish · public security datasets (CISA KEV, OWASP, MITRE ATT&CK ✅ ; NVD 338K syncing) |
| **2027+** 📋 vision | Distribution & enterprise | Mobile + desktop GA · connector marketplace · SAML / SCIM · SOC 2 Type II · self-hosted edge runtime (foundation already shipped) |

Already shipped this cycle: 87 connectors, 533 passing edge-runtime tests, Computer agents with Temporal-backed runs, MCP server with rich UI views, signed CLI release pipeline.

<br />

## Community

We're early. There's no Discord yet, no 10,000-member Slack, no Twitter Space tomorrow. What there is: a repo, a small group of contributors, and a founder who reads every issue. If you build with us now, your name shows up next to ours when this gets big.

- **GitHub Issues** — [github.com/kuluruvineeth/openbeam/issues](https://github.com/kuluruvineeth/openbeam/issues) — bugs, feature requests, design discussions
- **Twitter / X** — [@kuluruvineeth](https://x.com/kuluruvineeth) — release notes, demos, ship logs
- **Web** — [openbeam.work](https://openbeam.work) · [docs.openbeam.work](https://docs.openbeam.work)
- **Security disclosures** — file a private security advisory on the repo

<br />

## Contributing

The 30-second version (full guide in [CONTRIBUTING.md](./CONTRIBUTING.md)):

1. Pick a connector under `packages/services/` to extend or fix — the `/connector` slash command in Claude Code automates ~80% of the boilerplate.
2. `bun install && bun run dev`
3. Open a PR against the `dev` branch using conventional commits — `feat(connector): add foo`, one line, no body.
4. Be kind in code review. We optimize for craft, not for being right.

Connector work is the fastest path to a merged PR. Browse [good first issues →](https://github.com/kuluruvineeth/openbeam/issues?q=is%3Aopen+label%3A%22good+first+issue%22)

<br />

## Stats

[![Star History Chart](https://api.star-history.com/svg?repos=kuluruvineeth/openbeam&type=Date)](https://www.star-history.com/#kuluruvineeth/openbeam&Date)

<br />

## License

OpenBeam is open source under the **AGPL-3.0** license. We will sell premium support and an Enterprise Edition (SSO, audit log retention, dedicated tenancy, on-prem keys) for organizations that need it. If you're shipping a closed-source SaaS on top of OpenBeam, [talk to us first](https://openbeam.work).

A `LICENSE` file lands with the next release; until then, the badge in the header reflects intent and the `package.json` declarations are the source of truth.

### Acknowledgements

Inspired by [**Glean**](https://glean.com), [**Onyx**](https://onyx.app), [**Midday Computer**](https://midday.ai), [**Notion**](https://notion.so), and [**Linear**](https://linear.app) — the bar we measure ourselves against on connector coverage, agent depth, and craft.

Connector implementations reference the public OAuth and REST documentation of each provider — no proprietary SDKs reverse-engineered.

<br />

<div align="center">
  <a href="https://openbeam.work">openbeam.work</a>
  ·
  <a href="https://docs.openbeam.work">docs</a>
  ·
  <a href="https://github.com/kuluruvineeth/openbeam">github</a>
  ·
  <a href="https://github.com/kuluruvineeth/openbeam/releases/latest">latest release</a>
</div>
