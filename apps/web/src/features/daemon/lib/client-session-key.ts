const STORAGE_KEY = "@openbeam:client-session-key-v1";

let cached: string | null = null;

function generate(): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `clsk_${uuid}`;
}

export function getOrCreateClientSessionKey(): string {
  if (cached) {
    return cached;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      cached = stored.trim();
      return cached;
    }
  }

  const key = generate();

  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(STORAGE_KEY, key);
  }

  cached = key;
  return key;
}
