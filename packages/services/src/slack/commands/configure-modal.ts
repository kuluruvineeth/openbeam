import type { View } from "@slack/web-api";
import type { ResponseMode } from "../assistant/types";

export interface ChannelConfigSettings {
  responseMode: ResponseMode;
  reactionsEnabled: boolean;
  respondToWorkflows: boolean;
}

const RESPONSE_MODE_OPTIONS = [
  {
    text: { type: "plain_text" as const, text: "Always respond to questions" },
    value: "always",
  },
  {
    text: {
      type: "plain_text" as const,
      text: "Only when confident (recommended)",
    },
    value: "confident",
  },
  {
    text: { type: "plain_text" as const, text: "Only when @mentioned" },
    value: "mention_only",
  },
  {
    text: {
      type: "plain_text" as const,
      text: "Don't respond in this channel",
    },
    value: "never",
  },
] as const;

const DEFAULT_SETTINGS: ChannelConfigSettings = {
  responseMode: "confident",
  reactionsEnabled: true,
  respondToWorkflows: false,
};

function getResponseModeOption(mode: ResponseMode) {
  return (
    RESPONSE_MODE_OPTIONS.find((opt) => opt.value === mode) ??
    RESPONSE_MODE_OPTIONS[1]
  );
}

export function buildConfigureChannelModal(
  channelId: string,
  connectorId: string,
  settings?: Partial<ChannelConfigSettings>
): View {
  const merged = { ...DEFAULT_SETTINGS, ...settings };

  const reactionsOption = {
    text: { type: "plain_text" as const, text: "Show emoji reactions" },
    value: "enabled",
    description: {
      type: "plain_text" as const,
      text: "Add 👀 when processing, ✅ when answered",
    },
  };

  const workflowsOption = {
    text: {
      type: "plain_text" as const,
      text: "Respond to workflow messages",
    },
    value: "enabled",
    description: {
      type: "plain_text" as const,
      text: "Answer questions from automated workflows and bots",
    },
  };

  return {
    type: "modal",
    callback_id: "configure_channel",
    private_metadata: JSON.stringify({ channelId, connectorId }),
    title: { type: "plain_text", text: "Configure OpenPlane" },
    submit: { type: "plain_text", text: "Save" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*How should OpenPlane respond in this channel?*",
        },
      },
      {
        type: "input",
        block_id: "response_mode",
        element: {
          type: "static_select",
          action_id: "response_mode_select",
          initial_option: getResponseModeOption(merged.responseMode),
          options: [...RESPONSE_MODE_OPTIONS],
        },
        label: { type: "plain_text", text: "Response Mode" },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Visual Feedback*",
        },
      },
      {
        type: "input",
        block_id: "reactions_enabled",
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "reactions_checkbox",
          options: [reactionsOption],
          ...(merged.reactionsEnabled && {
            initial_options: [reactionsOption],
          }),
        },
        label: { type: "plain_text", text: " " },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Automation*",
        },
      },
      {
        type: "input",
        block_id: "workflows",
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "workflows_checkbox",
          options: [workflowsOption],
          ...(merged.respondToWorkflows && {
            initial_options: [workflowsOption],
          }),
        },
        label: { type: "plain_text", text: " " },
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "💡 These settings only apply to this channel. Configure your daily digest from the App Home tab.",
          },
        ],
      },
    ],
  };
}
