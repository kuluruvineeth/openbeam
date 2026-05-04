<div align="center">

<a href="https://openbeam.work">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/website/public/logo_dark.png">
    <img alt="OpenBeam" src="apps/website/public/logo.png" width="80">
  </picture>
</a>

### OpenBeam

Slack, Jira, Notion, and your Verkada cameras in the same search box.

[openbeam.work](https://openbeam.work) · [docs](https://docs.openbeam.work) · [@kuluruvineeth](https://x.com/kuluruvineeth)

[![License](https://img.shields.io/badge/license-AGPL_3.0-purple)](LICENSE) [![Release](https://img.shields.io/github/v/release/kuluruvineeth/openbeam?label=release&color=green)](https://github.com/kuluruvineeth/openbeam/releases/latest)

</div>

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="apps/website/public/images/examples/a22.png">
  <img src="apps/website/public/hero-screenshot.png" alt="OpenBeam search across 87 sources" />
</picture>

<br />
<br />

OpenBeam is open-source enterprise search that also indexes IoT and industrial systems. 87 sources right now: Slack, GitHub, Notion, Gmail, Salesforce, Linear, Jira, AWS IoT, Verkada, Samsara, MQTT, OPC-UA, plus 75 more. Vespa hybrid search with cited answers. MCP server for Claude Code, Cursor, and Codex. Self-hosted, AGPL-3.0.

v0.1.1. One maintainer ([@kuluruvineeth](https://github.com/kuluruvineeth)). Expect bugs.

## Install

```bash
brew install kuluruvineeth/tap/openbeam              # macOS
curl -fsSL https://openbeam.work/install.sh | bash   # Linux / macOS
scoop bucket add openbeam https://github.com/kuluruvineeth/scoop-bucket && scoop install openbeam   # Windows
```

Docker: `ghcr.io/kuluruvineeth/openbeam-cli:latest`.

## Run

```bash
openbeam auth login --api-key op_live_xxx
openbeam search query "kubernetes upgrade runbook"
```

From TypeScript:

```typescript
import OpenBeam from "@openbeam/sdk";

const ob = new OpenBeam({ apiKey: process.env.OPENBEAM_API_KEY! });
const { data } = await ob.agents.ask("Where did we land on the auth rewrite?");
console.log(data.answer);
```

## Connectors

Slack, Notion, GitHub, Gmail, Linear, Jira, Confluence, Salesforce, Google Drive, Dropbox, Box, Zoom, Figma, Datadog, Workday, NetSuite, DocuSign, Samsara, Verkada, AWS IoT, SmartThings, and 66 more. [Full list](https://docs.openbeam.work/connectors).

Industrial protocols (MQTT, OPC-UA, BACnet, ThingsBoard, Node-RED) ship via [`apps/iot-gateway`](./apps/iot-gateway).

Each connector takes about 2 to 3 hours to write. Don't see what you need? [Open an issue](https://github.com/kuluruvineeth/openbeam/issues/new) or send a PR.

## Docs

[Connectors](https://docs.openbeam.work/connectors) · [Agents](https://docs.openbeam.work/computer) · [MCP](https://docs.openbeam.work/mcp) · [Self-hosting](https://docs.openbeam.work/self-host) · [API](https://docs.openbeam.work/api)

## Contributing

```bash
bun install && bun run dev
```

Pick a connector under `packages/services/` to add or fix. PR against `dev`. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[AGPL-3.0](./LICENSE).

Built by [@kuluruvineeth](https://github.com/kuluruvineeth).
