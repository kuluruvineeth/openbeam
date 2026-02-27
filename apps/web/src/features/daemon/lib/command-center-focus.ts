let focusRestoreElement: HTMLElement | null = null;

export function setCommandCenterFocusRestoreElement(
  element: HTMLElement | null
): void {
  focusRestoreElement = element;
}

export function takeCommandCenterFocusRestoreElement(): HTMLElement | null {
  const el = focusRestoreElement;
  focusRestoreElement = null;
  return el;
}

export function clearCommandCenterFocusRestoreElement(): void {
  focusRestoreElement = null;
}

const DEFAULT_RETRY_INTERVAL_MS = 50;
const DEFAULT_MAX_RETRIES = 6;

export function focusWithRetries(options: {
  focus: () => void;
  isFocused: () => boolean;
  onTimeout?: () => void;
  intervalMs?: number;
  maxRetries?: number;
}): () => void {
  const intervalMs = options.intervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  let attempt = 0;
  let cancelled = false;

  const tryFocus = () => {
    if (cancelled) {
      return;
    }
    if (options.isFocused()) {
      return;
    }
    if (attempt >= maxRetries) {
      options.onTimeout?.();
      return;
    }
    attempt += 1;
    options.focus();
    setTimeout(tryFocus, intervalMs);
  };

  tryFocus();

  return () => {
    cancelled = true;
  };
}
