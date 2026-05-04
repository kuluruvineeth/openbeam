<div align="center">

<a href="https://openbeam.work">
  <img src="apps/website/public/logo_dark.png" alt="OpenBeam" width="64" />
</a>

<h3>OpenBeam</h3>

<p>The open source Glean alternative for the physical world</p>

<a href="https://openbeam.work">Website</a> · <a href="https://docs.openbeam.work">Docs</a> · <a href="https://github.com/kuluruvineeth/openbeam/releases/latest">Releases</a> · <a href="https://github.com/kuluruvineeth/openbeam/issues">Issues</a>

<br />

[![GitHub Stars](https://img.shields.io/github/stars/kuluruvineeth/openbeam?style=social)](https://github.com/kuluruvineeth/openbeam)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Latest Release](https://img.shields.io/github/v/release/kuluruvineeth/openbeam?label=release&color=green)](https://github.com/kuluruvineeth/openbeam/releases/latest)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker)](https://github.com/kuluruvineeth/openbeam/pkgs/container/openbeam-cli)
[![Last Commit](https://img.shields.io/github/last-commit/kuluruvineeth/openbeam)](https://github.com/kuluruvineeth/openbeam/commits/dev)

</div>

<br />

<div align="center">
  <img src="apps/website/public/hero-screenshot.png" alt="OpenBeam — enterprise search across SaaS and IoT" width="90%" />
</div>

<br />

Enterprise knowledge is trapped in silos. Digital tools (Slack, GitHub, Notion, Gmail) don't talk to physical systems (IoT sensors, industrial protocols, camera feeds). **OpenBeam unifies both into one searchable, agent-ready layer.** One query across sensors and SaaS. Answers in 200ms. Runs on your servers.

Glean proved the digital half at a $7.2B valuation. Nobody has built the physical half. We're building both.

## Features

- **Unified Search** — Hybrid semantic + keyword search across all connected sources, sub-200ms p99 latency
- **AI Agents** — Tool-use agents that search, analyze, and act across your entire knowledge base with 100+ composable tools
- **Computer** — Six pre-built autonomous agents on Temporal cron schedules with approval gating and persistent memory
- **Physical + Digital** — The only platform bridging SaaS tools and physical operations data in one query
- **87 Connectors** — Slack, GitHub, Notion, Linear, Salesforce, Jira, Gmail, plus IoT (Samsara, Verkada, AWS IoT) and industrial protocols (MQTT, OPC-UA, BACnet)
- **MCP Server** — First-class Model Context Protocol server for Claude Code, Cursor, Codex, and any MCP client
- **RAG Pipeline** — Grounded AI answers with citation and source attribution
- **Real-time Sync** — Webhooks and incremental sync keep your index fresh
- **Permission-Aware** — Respects source permissions — users only see what they have access to
- **Self-Hostable** — Deploy on your infrastructure with Docker Compose. Your data never leaves your servers
- **Edge Ready** — Offline-capable edge deployment with SQLite, local search, and sync protocol

## Connectors

<table>
<tr>
<td width="25%">

**Digital Knowledge**
- Notion
- Confluence
- Coda
- Evernote
- Airtable
- Smartsheet
- Google Sites
- OneNote

</td>
<td width="25%">

**Communication**
- Slack
- Microsoft Teams
- Gmail
- Outlook
- Google Chat
- Intercom

</td>
<td width="25%">

**IoT Platforms**
- AWS IoT Core
- SmartThings
- Samsara
- Verkada

</td>
<td width="25%">

**Industrial Protocols**
- MQTT
- OPC-UA
- BACnet
- ThingsBoard
- Node-RED

</td>
</tr>
</table>

Plus 60+ more across CRM (Salesforce, HubSpot, Pipedrive, Zendesk), Code (GitHub, GitLab, Bitbucket, Jenkins), Storage (Google Drive, Dropbox, Box, S3, SharePoint), Project Management (Linear, Jira, Asana, ClickUp, Monday), Design (Figma, Canva, Miro), HR (Workday, BambooHR, Greenhouse), and more. [Full connector list →](https://docs.openbeam.work/connectors)

## Install the CLI

Cross-platform Go binary, signed with cosign, with SLSA Level 3 build provenance.

```bash
# macOS — Homebrew
brew install kuluruvineeth/tap/openbeam

# Linux / macOS — curl
curl -fsSL https://openbeam.work/install.sh | bash

# Windows — Scoop
scoop bucket add openbeam https://github.com/kuluruvineeth/scoop-bucket
scoop install openbeam

# Docker
docker run --rm ghcr.io/kuluruvineeth/openbeam-cli:latest version
```

Or download `.deb`, `.rpm`, `.apk`, Arch, or platform binaries from the [latest release](https://github.com/kuluruvineeth/openbeam/releases/latest).

```bash
openbeam auth login --api-key op_live_xxx
openbeam search query "kubernetes upgrade runbook"
openbeam upgrade           # self-update
openbeam doctor            # diagnose install + auth + connectivity
openbeam computer run knowledge-digest --wait
```

[CLI documentation →](https://docs.openbeam.work/cli/install)

## Computer — Autonomous Agents

Six pre-built agents that run on a schedule, ask for approval before any write, and remember context across runs.

| Agent | What it does |
|---|---|
| **Knowledge Digest** | Weekly summary of new content across every connected source |
| **Stale Content Detector** | Flags docs older than 90 days for archival or refresh |
| **Connector Health** | Watches sync failures and re-auths expiring OAuth tokens |
| **Search Quality** | Audits failed queries and proposes connector + index fixes |
| **Onboarding Curator** | Generates personalized reading lists for new hires |
| **Compliance Watchdog** | Alerts on exposed credentials or PII in indexed content |

Each agent is durable via Temporal, multi-surface (CLI / Dashboard / Chat / API / MCP), and approval-gated for any third-party write action. Custom agents are defined by a prompt and a tool list.

```bash
openbeam computer enable knowledge-digest --schedule "0 9 * * MON"
openbeam computer run knowledge-digest --wait
openbeam computer approve <run-id> --actions "archive,notify"
```

[Computer documentation →](https://docs.openbeam.work/computer)

## Quick Start

```bash
git clone https://github.com/kuluruvineeth/openbeam.git
cd openbeam
make setup    # Install deps, start infra, setup database
make apps     # Start all apps with hot reload
```

Open [http://localhost:3001](http://localhost:3001) and you're in.

### Self-Hosting with Docker

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.yml up -d
```

See the [Self-Hosting Guide](https://docs.openbeam.work/docs/self-hosting) for configuration, TLS, monitoring, and scaling.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Turborepo + Bun workspaces |
| **Frontend** | Next.js 16, React 19, TailwindCSS 4, shadcn/ui |
| **Backend** | Hono, tRPC 11, Temporal |
| **Database** | PostgreSQL + Prisma |
| **Search** | Vespa (hybrid: BM25 + HNSW vectors) |
| **AI** | Vercel AI SDK, tool-use agents, MCP |
| **ML Engine** | Python (FastAPI), CPU + GPU services |
| **IoT Gateway** | MQTT, OPC-UA, BACnet protocol adapters |
| **Cache/Queue** | Redis |
| **Storage** | S3 / MinIO |
| **Auth** | Better Auth |
| **CLI** | Go 1.24, Cobra, GoReleaser |
| **Mobile** | React Native (Expo) |
| **Desktop** | Tauri |
| **Observability** | Prometheus, Grafana, Loki |

## Architecture

```
apps/
├── web/              # Next.js frontend             (:3001)
├── server/           # Hono API server              (:3000)
├── worker/           # Temporal workers
├── engine/           # Python ML service            (:8000 CPU, :8001 GPU)
├── daemon/           # Local agent orchestration daemon
├── cli/              # Go CLI (openbeam command)
├── gateway/          # IoT protocol gateway
├── sandbox-gateway/  # Sandbox execution gateway
├── docs/             # Documentation site           (:4000)
├── website/          # Marketing site               (:3002)
├── mobile/           # React Native (Expo)
├── desktop/          # Tauri desktop app
├── voice/            # Voice pipeline (STT/TTS)
├── extension/        # Browser extension
├── bot/              # Slack bot
└── video/            # Remotion changelog videos

packages/
├── ai/              # AI tools, agents, RAG engine
├── api/             # tRPC routers
├── auth/            # Authentication (Better Auth)
├── db/              # Prisma schema & queries
├── types/           # Shared TypeScript types
├── config/          # Shared configuration
├── ui/              # Shared UI components
│
├── services/        # Connector business logic (87 connectors)
├── integrations/    # OAuth configs, app registry
├── temporal/        # Workflows & activities
├── computer/        # Autonomous agent platform
├── orchestrations/  # Multi-agent orchestration
│
├── vespa/           # Vespa search client
├── redis/           # Redis utilities
├── storage/         # S3 / R2 client
├── media/           # TwelveLabs video processing
│
├── mcp/             # @openbeam/mcp server
├── mcp-apps/        # MCP UI apps for Claude Desktop
├── sdk/             # @openbeam/sdk (TypeScript)
├── analytics/       # PostHog integration & metrics
├── observability/   # Telemetry & monitoring
├── sandbox/         # Sandbox runtime
├── relay/           # Daemon ↔ client bridge
│
├── edge-core/       # Edge runtime (bun:sqlite + WAL)
├── edge-search/     # Edge hybrid search (FTS5 + vector)
├── edge-ai/         # On-device RAG
│
├── spatial-core/    # Spatial AI primitives
├── spatial-editor/  # Spatial scene editor
└── spatial-viewer/  # Spatial scene viewer
```

## Development

```bash
make setup        # First-time setup (deps, infra, database)
make dev          # Start infrastructure services
make apps         # Start all apps with hot reload
make status       # Show service health
make down         # Stop infrastructure

bun run check     # Lint & format (Biome)
bun run build     # Build all packages
bun test          # Run tests
```

| Service | Local URL |
|---------|-----------|
| Web App | [localhost:3001](http://localhost:3001) |
| API Server | [localhost:3000](http://localhost:3000) |
| Docs | [localhost:4000](http://localhost:4000) |
| Temporal UI | [localhost:8233](http://localhost:8233) |
| Grafana | [localhost:3002](http://localhost:3002) |
| MinIO Console | [localhost:9001](http://localhost:9001) |

## Why Open Source?

Enterprise search touches your most sensitive data — every message, document, sensor reading, and credential. You should be able to read every line of code that processes it.

AGPL-3.0 licensed. Self-host it, audit it, extend it. No vendor lock-in. No data leaving your network.

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/YOUR_USERNAME/openbeam.git
cd openbeam
make setup && make apps
```

Connectors are the fastest path to a merged PR — each takes about 2-3 hours. Check the [`good first issue`](https://github.com/kuluruvineeth/openbeam/labels/good%20first%20issue) label to get started.

## Star History

<a href="https://www.star-history.com/#kuluruvineeth/openbeam&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=kuluruvineeth/openbeam&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=kuluruvineeth/openbeam&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=kuluruvineeth/openbeam&type=Date" />
  </picture>
</a>

## License

[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)

---

<div align="center">

<strong>Built by <a href="https://github.com/kuluruvineeth">@kuluruvineeth</a></strong>

<a href="https://openbeam.work">Website</a> · <a href="https://docs.openbeam.work">Docs</a> · <a href="https://openbeam.work/pitch">Pitch Deck</a> · <a href="https://cal.com/kuluruvineeth/30min">Book a Demo</a>

</div>
