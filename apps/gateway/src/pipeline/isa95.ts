import type { Isa95Context } from "@openplane/types/services/connectors/common/industrial";
import { Isa95LevelNames } from "@openplane/types/services/connectors/common/industrial";

export function parseIsa95Path(topicOrPath: string): Isa95Context {
  const segments = topicOrPath.split("/").filter(Boolean);

  const context: Isa95Context = {
    enterprise: segments[0],
    site: segments[1],
    area: segments[2],
    line: segments[3],
    cell: segments[4],
    device: segments[5],
    datapoint: segments[6],
    labels: [],
  };

  context.labels = segments
    .slice(0, Isa95LevelNames.length)
    .map((segment, i) => `${Isa95LevelNames[i]}:${segment}`);

  return context;
}

export function parseSparkplugTopic(topic: string): Isa95Context {
  const parts = topic.split("/");
  // spBv1.0/{group_id}/{message_type}/{edge_node_id}/{device_id}
  const groupId = parts[1] ?? "";
  const edgeNodeId = parts[3] ?? "";
  const deviceId = parts[4];

  const groupSegments = groupId.split("/");
  const nodeSegments = edgeNodeId.split("/");

  return parseIsa95Path(
    [...groupSegments, ...nodeSegments, ...(deviceId ? [deviceId] : [])].join(
      "/"
    )
  );
}

export function buildIsa95Path(ctx: Isa95Context): string {
  const parts = [
    ctx.enterprise,
    ctx.site,
    ctx.area,
    ctx.line,
    ctx.cell,
    ctx.device,
    ctx.datapoint,
  ].filter(Boolean);

  return parts.join("/");
}

export function buildIsa95Metadata(ctx: Isa95Context): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (ctx.enterprise) {
    metadata.isa95_enterprise = ctx.enterprise;
  }
  if (ctx.site) {
    metadata.isa95_site = ctx.site;
  }
  if (ctx.area) {
    metadata.isa95_area = ctx.area;
  }
  if (ctx.line) {
    metadata.isa95_line = ctx.line;
  }
  if (ctx.cell) {
    metadata.isa95_cell = ctx.cell;
  }
  if (ctx.device) {
    metadata.isa95_device = ctx.device;
  }
  if (ctx.datapoint) {
    metadata.isa95_datapoint = ctx.datapoint;
  }
  return metadata;
}
