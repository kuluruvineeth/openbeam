interface DiscordModal {
  type: 9;
  data: {
    custom_id: string;
    title: string;
    components: Array<{
      type: 1;
      components: Record<string, unknown>[];
    }>;
  };
}

export function buildConfirmationModal(
  pendingId: string,
  description: string
): DiscordModal {
  return {
    type: 9,
    data: {
      custom_id: `action_confirm_${pendingId}`,
      title: "Confirm Action",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: "description",
              label: description.slice(0, 45),
              style: 2,
              value: description,
              required: false,
            },
          ],
        },
      ],
    },
  };
}

export function buildDeferredPayload(): { type: 5 } {
  return { type: 5 };
}
