# OpenBeam

OpenBeam is enterprise search for companies that have both a Notion workspace and a building full of cameras.

I've been building this alone in the evenings for about six months. It's v0.1.1 — the 87 connectors run, but most have only been tested against my own accounts, and there are bugs. I'm [@kuluruvineeth](https://github.com/kuluruvineeth) and that's also where to file issues.

## Install

```bash
brew install kuluruvineeth/tap/openbeam
```

Linux, Windows, Docker, and Linux package managers in the [installation docs](https://docs.openbeam.work/install).

## Run

```bash
openbeam auth login --api-key op_live_xxx
openbeam search query "kubernetes upgrade runbook"
```

The unusual connectors — Samsara, Verkada, AWS IoT, MQTT, OPC-UA, BACnet — are why this exists. Other open-source enterprise search projects ignore the physical world. [Full connector list](https://docs.openbeam.work/connectors).

To hack on it: `bun install && bun run dev`. PRs welcome on `dev`. Each connector takes a couple of hours to write.

[AGPL-3.0](./LICENSE).
