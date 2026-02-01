import { defineSignal, setHandler } from "@temporalio/workflow";

export const cancelSignal = defineSignal("cancel");
export const pauseSignal = defineSignal("pause");
export const resumeSignal = defineSignal("resume");
export const updateConfigSignal =
  defineSignal<[Record<string, unknown>]>("updateConfig");

export interface SignalHandlers<TState> {
  onCancel?: (state: TState) => void;
  onPause?: (state: TState) => void;
  onResume?: (state: TState) => void;
  onUpdateConfig?: (state: TState, config: Record<string, unknown>) => void;
}

export function createSignalHandlers<TState>(
  getState: () => TState,
  handlers: SignalHandlers<TState>
): void {
  if (handlers.onCancel) {
    setHandler(cancelSignal, () => handlers.onCancel?.(getState()));
  }

  if (handlers.onPause) {
    setHandler(pauseSignal, () => handlers.onPause?.(getState()));
  }

  if (handlers.onResume) {
    setHandler(resumeSignal, () => handlers.onResume?.(getState()));
  }

  if (handlers.onUpdateConfig) {
    setHandler(updateConfigSignal, (config: Record<string, unknown>) =>
      handlers.onUpdateConfig?.(getState(), config)
    );
  }
}
