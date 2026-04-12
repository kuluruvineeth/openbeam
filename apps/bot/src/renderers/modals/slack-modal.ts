import type { PendingAction } from "../../lib/pending-actions";

type Block = Record<string, unknown>;

interface SlackModal {
  type: "modal";
  callback_id: string;
  title: { type: "plain_text"; text: string };
  submit: { type: "plain_text"; text: string };
  close: { type: "plain_text"; text: string };
  private_metadata: string;
  blocks: Block[];
}

export function buildConfirmationModal(action: PendingAction): SlackModal {
  const blocks: Block[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `You're about to: *${action.description}*`,
      },
    },
    { type: "divider" },
  ];

  const paramEntries = Object.entries(action.params);
  if (paramEntries.length > 0) {
    const fields = paramEntries.slice(0, 10).map(([k, v]) => ({
      type: "mrkdwn",
      text: `*${k}:* ${String(v)}`,
    }));
    blocks.push({ type: "section", fields });
  }

  if (action.stakes === "high") {
    blocks.push({
      type: "input",
      block_id: "reason_block",
      element: {
        type: "plain_text_input",
        action_id: "reason_input",
        placeholder: { type: "plain_text", text: "Why is this needed?" },
      },
      label: { type: "plain_text", text: "Reason" },
      optional: true,
    });
  }

  return {
    type: "modal",
    callback_id: `action_confirm_${action.pendingId}`,
    title: { type: "plain_text", text: "Confirm Action" },
    submit: { type: "plain_text", text: "Confirm" },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({
      pendingId: action.pendingId,
      connectorId: action.connectorId,
      actionId: action.actionId,
    }),
    blocks,
  };
}
