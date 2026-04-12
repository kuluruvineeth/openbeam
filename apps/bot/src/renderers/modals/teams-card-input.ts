import type { PendingAction } from "../../lib/pending-actions";

type CardElement = Record<string, unknown>;

interface AdaptiveCard {
  type: "AdaptiveCard";
  version: "1.5";
  body: CardElement[];
  actions: CardElement[];
}

export function buildConfirmationCard(action: PendingAction): AdaptiveCard {
  const body: CardElement[] = [
    {
      type: "TextBlock",
      text: "Confirm Action",
      weight: "bolder",
      size: "large",
    },
    {
      type: "TextBlock",
      text: action.description,
      wrap: true,
    },
  ];

  const paramEntries = Object.entries(action.params);
  if (paramEntries.length > 0) {
    body.push({
      type: "FactSet",
      facts: paramEntries.slice(0, 10).map(([k, v]) => ({
        title: k,
        value: String(v),
      })),
    });
  }

  if (action.stakes === "high") {
    body.push({
      type: "Input.Text",
      id: "reason",
      label: "Reason (optional)",
      isMultiline: false,
    });
  }

  return {
    type: "AdaptiveCard",
    version: "1.5",
    body,
    actions: [
      {
        type: "Action.Submit",
        title: "Confirm",
        style: "positive",
        data: { action: "confirm", pendingId: action.pendingId },
      },
      {
        type: "Action.Submit",
        title: "Cancel",
        style: "destructive",
        data: { action: "cancel", pendingId: action.pendingId },
      },
    ],
  };
}

export function buildProgressiveCard(
  summary: CardElement[],
  details: CardElement[]
): AdaptiveCard {
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      ...summary,
      {
        type: "Container",
        id: "details_section",
        isVisible: false,
        items: details,
      },
    ],
    actions: [
      {
        type: "Action.ToggleVisibility",
        title: "Show Details",
        targetElements: ["details_section"],
      },
    ],
  };
}
