import type { GmailLabel, GmailTransformContext } from "../types";

export interface GmailLabelEntity {
  id: string;
  connectorId: string;
  externalId: string;
  name: string;
  type: "system" | "user";
  isVisible: boolean;
  messageCount: number;
  unreadCount: number;
  color?: {
    text?: string;
    background?: string;
  };
}

export function transformLabel(
  label: GmailLabel,
  context: GmailTransformContext
): GmailLabelEntity {
  return {
    id: `${context.connectorId}_label_${label.id}`,
    connectorId: context.connectorId,
    externalId: label.id,
    name: label.name,
    type: label.type ?? "user",
    isVisible: label.labelListVisibility !== "labelHide",
    messageCount: label.messagesTotal ?? 0,
    unreadCount: label.messagesUnread ?? 0,
    color: label.color
      ? {
          text: label.color.textColor,
          background: label.color.backgroundColor,
        }
      : undefined,
  };
}

export function transformLabels(
  labels: GmailLabel[],
  context: GmailTransformContext
): GmailLabelEntity[] {
  return labels.map((label) => transformLabel(label, context));
}

export function getLabelHierarchy(
  labels: GmailLabel[]
): Map<string, GmailLabel[]> {
  const hierarchy = new Map<string, GmailLabel[]>();

  for (const label of labels) {
    if (label.type === "system") {
      continue;
    }

    const parts = label.name.split("/");
    if (parts.length > 1) {
      const parent = parts.slice(0, -1).join("/");
      const existing = hierarchy.get(parent) ?? [];
      existing.push(label);
      hierarchy.set(parent, existing);
    }
  }

  return hierarchy;
}

export function getTopLevelLabels(labels: GmailLabel[]): GmailLabel[] {
  return labels.filter((label) => {
    if (label.type === "system") {
      return true;
    }
    return !label.name.includes("/");
  });
}

export function findLabelByName(
  labels: GmailLabel[],
  name: string
): GmailLabel | undefined {
  const normalizedName = name.toLowerCase();
  return labels.find((label) => label.name.toLowerCase() === normalizedName);
}

export function filterUserLabels(labels: GmailLabel[]): GmailLabel[] {
  return labels.filter((label) => label.type === "user");
}

export function filterSystemLabels(labels: GmailLabel[]): GmailLabel[] {
  return labels.filter((label) => label.type === "system");
}

export function getVisibleLabels(labels: GmailLabel[]): GmailLabel[] {
  return labels.filter((label) => label.labelListVisibility !== "labelHide");
}
