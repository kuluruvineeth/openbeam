import type { AwsIotTransformContext } from "@openplane/types/services/connectors/aws-iot";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AwsIotShadow, AwsIotThingDetail } from "../client";

export interface ThingWithShadow {
  thing: AwsIotThingDetail;
  shadow?: AwsIotShadow | null;
}

function buildThingContent(data: ThingWithShadow): string {
  const { thing, shadow } = data;
  const parts: string[] = [];

  if (thing.thingTypeName) {
    parts.push(`Type: ${thing.thingTypeName}`);
  }

  if (thing.attributes) {
    const attrs = Object.entries(thing.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    if (attrs) {
      parts.push(`Attributes: ${attrs}`);
    }
  }

  if (thing.billingGroupName) {
    parts.push(`Billing Group: ${thing.billingGroupName}`);
  }

  if (shadow?.state?.reported) {
    const reported = formatShadowState(shadow.state.reported);
    if (reported) {
      parts.push(`Reported State: ${reported}`);
    }
  }

  if (shadow?.state?.desired) {
    const desired = formatShadowState(shadow.state.desired);
    if (desired) {
      parts.push(`Desired State: ${desired}`);
    }
  }

  return parts.join("\n");
}

function formatShadowState(state: Record<string, unknown>): string {
  return Object.entries(state)
    .map(([k, v]) => {
      if (typeof v === "object" && v !== null) {
        return `${k}: ${JSON.stringify(v)}`;
      }
      return `${k}: ${v}`;
    })
    .join(", ");
}

function buildThingMetadata(
  data: ThingWithShadow
): GenericDocument["metadata"] {
  const { thing, shadow } = data;
  return {
    thingName: thing.thingName,
    ...(thing.thingId && { thingId: thing.thingId }),
    ...(thing.thingTypeName && { thingType: thing.thingTypeName }),
    ...(thing.version != null && { version: thing.version }),
    ...(thing.defaultClientId && { clientId: thing.defaultClientId }),
    ...(thing.billingGroupName && {
      billingGroup: thing.billingGroupName,
    }),
    ...(thing.attributes && { attributes: thing.attributes }),
    ...(shadow?.version != null && { shadowVersion: shadow.version }),
    ...(shadow?.state?.reported && {
      shadowReported: JSON.stringify(shadow.state.reported),
    }),
    ...(shadow?.state?.desired && {
      shadowDesired: JSON.stringify(shadow.state.desired),
    }),
  };
}

export async function transformThing(
  data: ThingWithShadow,
  context: AwsIotTransformContext
): Promise<GenericDocument> {
  const title = data.thing.thingName;
  const content = buildThingContent(data);
  const metadata = buildThingMetadata(data);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();
  const updatedAt = data.shadow?.timestamp ? data.shadow.timestamp * 1000 : now;

  const consoleUrl = `https://${context.region}.console.aws.amazon.com/iot/home?region=${context.region}#/thing/${encodeURIComponent(data.thing.thingName)}`;

  return {
    id: `${context.connectorId}_thing_${data.thing.thingName}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: data.thing.thingName,
    document_type: "device",
    document_subtype: "thing",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "aws-iot",
    url: consoleUrl,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformThings(
  items: ThingWithShadow[],
  context: AwsIotTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(items.map((item) => transformThing(item, context)));
}
