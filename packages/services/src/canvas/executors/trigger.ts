import type { CanvasNodeExecutor } from "../types";

function resolveTriggerInput(
  input: unknown,
  context: { input?: unknown } | undefined
): unknown {
  if (input === undefined) {
    return context?.input;
  }
  return input;
}

export const triggerManualExecutor: CanvasNodeExecutor = ({ input, context }) =>
  resolveTriggerInput(input, context);

export const triggerScheduleExecutor: CanvasNodeExecutor = ({
  input,
  context,
}) => resolveTriggerInput(input, context);

export const triggerWebhookExecutor: CanvasNodeExecutor = ({
  input,
  context,
}) => resolveTriggerInput(input, context);

export const triggerEventExecutor: CanvasNodeExecutor = ({ input, context }) =>
  resolveTriggerInput(input, context);
