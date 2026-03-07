import {
  GMAIL_SYSTEM_LABELS,
  type GmailLabel,
  GmailLabelSchema,
  type GmailListLabelsResponse,
  GmailListLabelsResponseSchema,
} from "@openbeam/types/services/connectors/gmail";
import type { GmailClient } from "../client";

export async function listLabels(client: GmailClient): Promise<GmailLabel[]> {
  const response =
    await client.get<GmailListLabelsResponse>("/users/me/labels");

  const parsed = GmailListLabelsResponseSchema.safeParse(response);
  if (!parsed.success) {
    return [];
  }

  return parsed.data.labels ?? [];
}

export async function getLabel(
  client: GmailClient,
  labelId: string
): Promise<GmailLabel | null> {
  const response = await client.get<GmailLabel>(`/users/me/labels/${labelId}`);

  const parsed = GmailLabelSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function getLabelsByNames(
  client: GmailClient,
  names: string[]
): Promise<GmailLabel[]> {
  const allLabels = await listLabels(client);
  const normalizedNames = names.map((n) => n.toLowerCase());

  return allLabels.filter((label) =>
    normalizedNames.includes(label.name.toLowerCase())
  );
}

export async function getLabelsByIds(
  client: GmailClient,
  ids: string[]
): Promise<GmailLabel[]> {
  const allLabels = await listLabels(client);
  return allLabels.filter((label) => ids.includes(label.id));
}

export function isSystemLabel(labelId: string): boolean {
  return GMAIL_SYSTEM_LABELS.includes(
    labelId as (typeof GMAIL_SYSTEM_LABELS)[number]
  );
}

export function getUserLabels(labels: GmailLabel[]): GmailLabel[] {
  return labels.filter((label) => label.type === "user");
}

export function getSystemLabels(labels: GmailLabel[]): GmailLabel[] {
  return labels.filter((label) => label.type === "system");
}

export function buildLabelQuery(
  includeLabels?: string[],
  excludeLabels?: string[]
): string {
  const parts: string[] = [];

  if (includeLabels?.length) {
    const labelQueries = includeLabels.map((label) => `label:${label}`);
    parts.push(`(${labelQueries.join(" OR ")})`);
  }

  if (excludeLabels?.length) {
    for (const label of excludeLabels) {
      parts.push(`-label:${label}`);
    }
  }

  return parts.join(" ");
}

export interface LabelLookup {
  get(labelId: string): GmailLabel | undefined;
  getName(labelId: string): string | undefined;
  has(labelId: string): boolean;
  all(): GmailLabel[];
  size: number;
}

export async function createLabelLookup(
  client: GmailClient
): Promise<LabelLookup> {
  const labels = await listLabels(client);
  const labelMap = new Map<string, GmailLabel>();

  for (const label of labels) {
    labelMap.set(label.id, label);
  }

  return {
    get(labelId: string) {
      return labelMap.get(labelId);
    },
    getName(labelId: string) {
      return labelMap.get(labelId)?.name;
    },
    has(labelId: string) {
      return labelMap.has(labelId);
    },
    all() {
      return labels;
    },
    size: labels.length,
  };
}
