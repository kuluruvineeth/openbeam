<div align="center">

<a href="https://openbeam.work">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/website/public/logo_dark.png">
    <img alt="OpenBeam" src="apps/website/public/logo.png" width="72" />
  </picture>
</a>

<h1>OpenBeam</h1>

<p><strong>Open-source enterprise search across SaaS and the physical world.</strong></p>

<p>
  <a href="https://openbeam.work">openbeam.work</a> ·
  <a href="https://docs.openbeam.work">docs</a> ·
  <a href="https://github.com/kuluruvineeth/openbeam/releases/latest">latest release</a> ·
  <a href="https://x.com/kuluruvineeth">@kuluruvineeth</a>
</p>

<p>
  <a href="https://github.com/kuluruvineeth/openbeam/blob/dev/LICENSE"><img src="https://img.shields.io/badge/license-AGPL_3.0-blue.svg" alt="License" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam"><img src="https://img.shields.io/github/stars/kuluruvineeth/openbeam?style=flat&label=stars&color=yellow" alt="Stars" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/releases/latest"><img src="https://img.shields.io/github/v/release/kuluruvineeth/openbeam?label=release&color=green" alt="Release" /></a>
  <a href="https://github.com/kuluruvineeth/openbeam/pkgs/container/openbeam-cli"><img src="https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker" alt="Docker" /></a>
</p>

<br />

<a href="https://www.youtube.com/watch?v=J-72LXIYXK4">
  <img src="https://img.youtube.com/vi/J-72LXIYXK4/maxresdefault.jpg" alt="Demo" width="92%" />
</a>

</div>

<br />

OpenBeam indexes 87 sources — Slack, Notion, GitHub, Gmail, Salesforce, Linear, Jira, Google Drive, Confluence, plus the IoT and industrial systems Glean doesn't touch: MQTT, OPC-UA, BACnet, AWS IoT, Verkada, Samsara. One hybrid Vespa search across all of it. Citations on every answer.

v0.1.1. Built by [@kuluruvineeth](https://github.com/kuluruvineeth). PRs welcome.

## Install

| | |
|---|---|
| macOS | `brew install kuluruvineeth/tap/openbeam` |
| Linux / macOS | `curl -fsSL https://openbeam.work/install.sh \| bash` |
| Windows | `scoop bucket add openbeam https://github.com/kuluruvineeth/scoop-bucket; scoop install openbeam` |
| Docker | `docker run --rm ghcr.io/kuluruvineeth/openbeam-cli:latest version` |

Releases are signed with cosign and carry SLSA L3 build provenance.

## Try it

```bash
openbeam auth login --api-key op_live_xxx
openbeam search query "Q2 pricing decision"
```

From TypeScript:

```typescript
import OpenBeam from "@openbeam/sdk";
const ob = new OpenBeam({ apiKey: process.env.OPENBEAM_API_KEY! });

const { data } = await ob.agents.ask("What did the team decide about Q2 pricing?");
console.log(data.answer, data.citations);
```

## What's in here

- **[87 connectors →](https://docs.openbeam.work/connectors)** — SaaS, IoT, industrial. OAuth + sync + webhooks.
- **[Computer →](https://docs.openbeam.work/computer)** — six autonomous agents on Temporal cron schedules, with approval gating.
- **[MCP server →](https://docs.openbeam.work/mcp)** — Claude Code, Cursor, Codex.
- **[TypeScript SDK](https://npm.im/@openbeam/sdk)** + Go CLI.
- **[Edge runtime →](https://docs.openbeam.work/edge)** — `bun:sqlite` + FTS5 + vector hybrid + on-device RAG.
- **Vespa hybrid search**, permission-aware at the index.

## Compared

| | OpenBeam | Glean | Onyx | Confluence + Rovo |
|---|---|---|---|---|
| License | AGPL | proprietary | MIT | proprietary |
| Self-hosted | ✅ | ❌ | ✅ | ✅ ($$$) |
| IoT + industrial data | ✅ | ❌ | ❌ | ❌ |
| Autonomous agents | ✅ | ⚠️ | ⚠️ | ⚠️ |
| MCP server | ✅ | ❌ | ⚠️ | ❌ |
| Signed CLI | ✅ | ❌ | ⚠️ | ❌ |

[Full comparison →](https://docs.openbeam.work/compare) · [Roadmap →](https://docs.openbeam.work/roadmap)

## Contributing

```bash
bun install && bun run dev
```

Pick a connector under `packages/services/` to add or fix. PR against `dev` with conventional commits. [Good first issues →](https://github.com/kuluruvineeth/openbeam/issues?q=is%3Aopen+label%3A%22good+first+issue%22) · [CONTRIBUTING.md →](./CONTRIBUTING.md)

## License

[AGPL-3.0](./LICENSE). Premium support and an Enterprise Edition (SSO, audit log retention, on-prem keys) are coming. Inspired by [Glean](https://glean.com), [Onyx](https://onyx.app), [Midday](https://midday.ai), [Linear](https://linear.app).

<br />

<div align="center">
  <a href="https://openbeam.work">openbeam.work</a> ·
  <a href="https://docs.openbeam.work">docs</a> ·
  <a href="https://github.com/kuluruvineeth/openbeam">github</a>
</div>
