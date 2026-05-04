<div align="center">

<a href="https://openbeam.work">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/website/public/logo_dark.png">
    <img alt="OpenBeam" src="apps/website/public/logo.png" width="72" />
  </picture>
</a>

<h1>OpenBeam</h1>

<p>
  <strong>Open-source Glean — for SaaS <em>and</em> the physical world.</strong>
</p>

<p>
  <a href="https://openbeam.work">Website</a> ·
  <a href="https://docs.openbeam.work">Docs</a> ·
  <a href="https://github.com/kuluruvineeth/openbeam/releases/latest">Releases</a> ·
  <a href="https://x.com/kuluruvineeth">Twitter</a>
</p>

<p>
  <a href="https://github.com/kuluruvineeth/openbeam/blob/dev/LICENSE"><img src="https://img.shields.io/badge/license-AGPL_3.0-blue.svg" alt="License" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam"><img src="https://img.shields.io/github/stars/kuluruvineeth/openbeam?style=flat&label=stars&color=yellow" alt="Stars" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/releases/latest"><img src="https://img.shields.io/github/v/release/kuluruvineeth/openbeam?label=release&color=green" alt="Release" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/pkgs/container/openbeam-cli"><img src="https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker" alt="Docker" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/commits/dev"><img src="https://img.shields.io/github/last-commit/kuluruvineeth/openbeam" alt="Last commit" /></a>
</p>

<br />

<a href="https://www.youtube.com/watch?v=J-72LXIYXK4">
  <img src="https://img.youtube.com/vi/J-72LXIYXK4/maxresdefault.jpg" alt="Demo" width="92%" />
</a>

</div>

<br />

OpenBeam is enterprise search that indexes both the SaaS tools your company runs (Slack, GitHub, Notion, Gmail, Salesforce, …) **and** the physical-world systems Glean ignores (MQTT brokers, OPC-UA controllers, IoT fleets, security cameras). One query, hybrid search across all of it, sub-200ms p99, citations on every answer. Self-hosted. AGPL-3.0.

87 connectors today. 6 pre-built autonomous agents. CLI, MCP server, and TypeScript SDK out of the box.

<br />

## In 15 lines

```typescript
import OpenBeam from "@openbeam/sdk";

const ob = new OpenBeam({ apiKey: process.env.OPENBEAM_API_KEY! });

const { data } = await ob.agents.ask(
  "What did the team decide about pricing for Q2?",
  { connectorTypes: ["SLACK", "NOTION", "LINEAR"], maxSources: 5 }
);

console.log(data.answer);
//  "12% increase for enterprise tiers, effective May 1.
//   Self-serve unchanged. Finalized in the Apr 18 pricing sync."

console.log(data.citations);
//  [
//    { title: "Q2 Pricing Decision",  source: "Notion",  uri: "..." },
//    { title: "#pricing-sync thread", source: "Slack",   uri: "..." },
//    { title: "ENG-2174 Pricing API", source: "Linear",  uri: "..." }
//  ]
```

Same answer, from a terminal:

```bash
openbeam search query "Q2 pricing decision" --connectors SLACK,NOTION,LINEAR
```

<br />

## Install

| Platform | Command |
|---|---|
| **macOS** | `brew install kuluruvineeth/tap/openbeam` |
| **Linux / macOS** (curl) | `curl -fsSL https://openbeam.work/install.sh \| bash` |
| **Windows** | `scoop bucket add openbeam https://github.com/kuluruvineeth/scoop-bucket; scoop install openbeam` |
| **Docker** | `docker run --rm ghcr.io/kuluruvineeth/openbeam-cli:latest version` |
| **Direct** | [Latest release](https://github.com/kuluruvineeth/openbeam/releases/latest) — `.tar.gz`, `.deb`, `.rpm`, `.apk`, Arch, `.zip` |

Releases are signed with [cosign](https://docs.sigstore.dev/cosign/) (keyless OIDC) and carry [SLSA Level 3](https://slsa.dev/spec/v1.0/levels#build-l3) build provenance. Verify with `gh attestation verify`.

```bash
openbeam auth login --api-key op_live_xxx
openbeam search query "quarterly revenue across all teams"
openbeam computer run knowledge-digest --wait
```

<br />

## What's in the box

- **Hybrid search** — BM25 + dense vectors on [Vespa](https://vespa.ai). Permission-aware at the index, so users see only what they're entitled to.
- **Computer** — autonomous agents on a cron, durable via [Temporal](https://temporal.io), with approval gating for write actions and memory across runs. Six agents pre-built ([catalog ↓](#computer)).
- **87 connectors** — OAuth refresh, incremental sync, webhooks, rate limits ([list ↓](#connectors)). Includes IoT (Samsara, Verkada, AWS IoT, SmartThings) and industrial protocols (MQTT, OPC-UA, BACnet) — nothing else open-source covers these.
- **Context Database** — hierarchical L0/L1/L2 retrieval inspired by ByteDance's OpenViking. ~80–95% token savings vs flat RAG on long sessions.
- **MCP server** — built in. Claude Desktop, Cursor, Codex, anything that speaks Model Context Protocol gets the same tool surface as the dashboard.
- **Multi-surface** — Web, CLI (Go), TypeScript SDK, mobile, desktop, browser extension, voice, MCP. Same index, same auth, same agents.
- **Edge runtime** — pure-TS stack with bun:sqlite + FTS5 + vector hybrid + BLAKE3 Merkle sync + on-device RAG. 533 tests passing.

<br />

## Compared to

| | **OpenBeam** | **Glean** | **Onyx** | **Confluence + Rovo** |
|---|---|---|---|---|
| License | AGPL-3.0 | Proprietary | MIT | Proprietary |
| Self-hosted | ✅ | ❌ cloud-only | ✅ | ✅ Data Center ($$$) |
| Pricing entry | Free | Sales call, ~$50K+ | Free OSS / paid Pro | Bundled in Standard+ |
| Connectors | **87** | 100+ | 50+ | ~15 native |
| IoT + industrial data | ✅ MQTT, OPC-UA, BACnet, AWS IoT, Verkada, Samsara | ❌ | ❌ | ❌ |
| Search engine | Vespa (BM25 + HNSW) | proprietary | Vespa | Lucene |
| Autonomous agents | ✅ Computer (6 pre-built) | ⚠️ limited | ⚠️ limited | ⚠️ Rovo (beta) |
| MCP server | ✅ first-class | ❌ | ⚠️ supported | ❌ |
| CLI | ✅ Go, signed | ❌ | ⚠️ install script | ❌ |
| TypeScript SDK | ✅ `@openbeam/sdk` | REST only | REST only | REST only |
| Edge / offline | ✅ | ❌ | ❌ | ❌ |
| Vendor lock-in | None — own your data | High | Low | High |

<sub>Last verified 2026-05-04. PRs to keep this honest are welcome.</sub>

<br />

## <a id="computer"></a>Computer

Six agents you can enable today. Each runs on a schedule, asks for approval before writing anywhere, and remembers context across runs.

| Agent | Job |
|---|---|
| **Knowledge Digest** | Weekly summary of new content across every source |
| **Stale Content Detector** | Flags docs older than 90 days for archival or refresh |
| **Connector Health** | Watches sync failures and re-auths expiring tokens |
| **Search Quality** | Audits failed queries, proposes connector + index fixes |
| **Onboarding Curator** | Generates personalized reading lists for new hires |
| **Compliance Watchdog** | Alerts on exposed credentials or PII in indexed content |

```bash
openbeam computer enable knowledge-digest --schedule "0 9 * * MON"
openbeam computer run knowledge-digest --wait
openbeam computer approve <run-id> --actions "archive,notify"
```

Custom agents are defined by prompt — see [docs.openbeam.work/computer](https://docs.openbeam.work/computer).

<br />

## <a id="connectors"></a>Connectors

87 shipped. The full list:

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
<tr><th colspan="5" align="left">IoT & Physical World</th></tr>
<tr>
  <td>Samsara</td>
  <td>Verkada</td>
  <td>AWS IoT Core</td>
  <td>SmartThings</td>
  <td>—</td>
</tr>
</table>

<sub>Industrial protocols (MQTT, OPC-UA, BACnet, ThingsBoard, Node-RED) ship via the IoT gateway app — see <a href="./apps/iot-gateway"><code>apps/iot-gateway</code></a>. Don't see what you need? Connectors are ~2–3 hours of focused work each — <a href="https://github.com/kuluruvineeth/openbeam/issues">open an issue</a> or send a PR.</sub>

<br />

## Architecture

```
Surfaces:  Web · CLI · Mobile · Desktop · Browser ext · MCP
                                │
                                │  tRPC + REST (Hono)
                                ▼
                  Server ── Temporal workflows ── Vercel AI SDK
                    │              │
                    ▼              ▼
                Postgres     Computer agents (cron, signals)
                Redis
                                │
                                │  documents
                                ▼
                  Vespa  (BM25 + HNSW, sub-200ms p99)
                                ▲
                                │  Temporal sync
                                │
                  87 connectors · IoT gateway · Industrial protocols
```

Editable Excalidraw diagrams: [system context](apps/docs/public/diagrams/excalidraw/system-context.excalidraw) · [ER schema](apps/docs/public/diagrams/excalidraw/er-diagram.excalidraw) · [sync flow](apps/docs/public/diagrams/excalidraw/flow-connector-sync.excalidraw) · [search flow](apps/docs/public/diagrams/excalidraw/flow-search-request.excalidraw) · [deployment](apps/docs/public/diagrams/excalidraw/deployment-topology.excalidraw)

<br />

## Tech stack

[TypeScript](https://www.typescriptlang.org) · [Bun 1.3](https://bun.com) · [Next.js 16](https://nextjs.org) · [React 19](https://react.dev) · [Hono](https://hono.dev) · [tRPC 11](https://trpc.io) · [Prisma](https://www.prisma.io) + [PostgreSQL](https://www.postgresql.org) · [Redis](https://redis.io) · [Vespa](https://vespa.ai) · [Temporal](https://temporal.io) · [Vercel AI SDK](https://sdk.vercel.ai) · [Better Auth](https://www.better-auth.com) · [Tailwind 4](https://tailwindcss.com) · [Go + Cobra](https://github.com/spf13/cobra) (CLI) · [GoReleaser](https://goreleaser.com) · [Helm](https://helm.sh) + [Terraform](https://www.terraform.io) · [Remotion](https://www.remotion.dev)

<br />

## Roadmap

| Quarter | Focus | Items |
|---|---|---|
| **Q2 2026** ⏳ | Stability & autonomous agents | Computer (6 agents shipped) · CLI v1 (brew/scoop/winget/curl/Docker, cosign, SLSA L3) · close 29 missing connector lookup actions · `@openbeam/sdk` to npm |
| **Q3 2026** 📋 | Physical AI | Matterport · FHIR · Viam · NVIDIA Omniverse · Apple Vision Pro · Robot Knowledge API · spatial agent tools · PHI de-identification |
| **Q4 2026** 📋 | Vertical depth | AgroBeam (farm data, 8 phase plans) · spatial editor + viewer · browser extension polish · public security datasets |
| **2027+** 📋 | Distribution & enterprise | Mobile + desktop GA · connector marketplace · SAML / SCIM · SOC 2 Type II · self-hosted edge GA |

Shipped this cycle: 87 connectors, edge runtime (533 tests passing), Computer agents on Temporal, MCP server with rich UI views, signed CLI release pipeline.

<br />

## Community

- Issues — [github.com/kuluruvineeth/openbeam/issues](https://github.com/kuluruvineeth/openbeam/issues)
- Twitter — [@kuluruvineeth](https://x.com/kuluruvineeth)
- Web — [openbeam.work](https://openbeam.work) · [docs.openbeam.work](https://docs.openbeam.work)
- Security — file a private advisory on the repo

This project is in its first year. There's no Discord yet. If you build with it now, the founder reads every issue.

<br />

## Contributing

Full guide in [CONTRIBUTING.md](./CONTRIBUTING.md). The short version:

1. Pick a connector under `packages/services/` to extend or add — the `/connector` slash command in Claude Code automates ~80% of the boilerplate.
2. `bun install && bun run dev`
3. PR against `dev` with conventional commits (`feat(connector): add foo` — one line, no body).

Connector work is the fastest path to a merged PR. Browse [good first issues](https://github.com/kuluruvineeth/openbeam/issues?q=is%3Aopen+label%3A%22good+first+issue%22).

<br />

## Stats

![Repobeats](https://repobeats.axiom.co/api/embed/openbeam-readme.svg "Repobeats")

[![Star History](https://api.star-history.com/svg?repos=kuluruvineeth/openbeam&type=Date)](https://www.star-history.com/#kuluruvineeth/openbeam&Date)

<br />

## License

AGPL-3.0. The full text is in [`LICENSE`](./LICENSE). Premium support and an Enterprise Edition (SSO, audit log retention, dedicated tenancy, on-prem keys) are coming for organizations that need them. Building a closed-source SaaS on top of OpenBeam? [Get in touch first](https://openbeam.work).

Inspired by [Glean](https://glean.com), [Onyx](https://onyx.app), [Midday](https://midday.ai), [Notion](https://notion.so), [Linear](https://linear.app). Connector implementations reference each provider's public OAuth and REST documentation only.

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
