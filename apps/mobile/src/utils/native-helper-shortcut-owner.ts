type NativeHelperShortcutOwner = {
  key: string;
  focused: boolean;
};

let activeOwner: NativeHelperShortcutOwner | null = null;

export function claimNativeHelperShortcutOwnership(params: {
  key: string;
  focused: boolean;
}): boolean {
  const { key, focused } = params;
  if (!key.trim()) {
    return false;
  }

  if (!activeOwner) {
    activeOwner = { key, focused };
    return true;
  }

  if (activeOwner.key === key) {
    activeOwner = { key, focused };
    return true;
  }

  if (focused && !activeOwner.focused) {
    activeOwner = { key, focused };
    return true;
  }

  return false;
}

export function releaseNativeHelperShortcutOwnership(key: string): void {
  if (activeOwner?.key !== key) {
    return;
  }
  activeOwner = null;
}

export function isNativeHelperShortcutOwner(key: string): boolean {
  return activeOwner?.key === key;
}

export function resetNativeHelperShortcutOwnershipForTests(): void {
  activeOwner = null;
}

export function getNativeHelperShortcutOwnerForTests(): {
  key: string;
  focused: boolean;
} | null {
  if (!activeOwner) {
    return null;
  }
  return { ...activeOwner };
}
