import { EventTriggerNode } from "./event-trigger-node";
import { ManualTriggerNode } from "./manual-trigger-node";
import { ScheduleTriggerNode } from "./schedule-trigger-node";
import { WebhookTriggerNode } from "./webhook-trigger-node";

export type { EventTriggerNodeData } from "./event-trigger-node";
export { EventTriggerNode } from "./event-trigger-node";

export type { ManualTriggerNodeData } from "./manual-trigger-node";
export { ManualTriggerNode } from "./manual-trigger-node";

export type { ScheduleTriggerNodeData } from "./schedule-trigger-node";
export { ScheduleTriggerNode } from "./schedule-trigger-node";

export type { WebhookTriggerNodeData } from "./webhook-trigger-node";
export { WebhookTriggerNode } from "./webhook-trigger-node";

export const triggerNodeTypes = {
  trigger_manual: ManualTriggerNode,
  trigger_schedule: ScheduleTriggerNode,
  trigger_webhook: WebhookTriggerNode,
  trigger_event: EventTriggerNode,
} as const;
