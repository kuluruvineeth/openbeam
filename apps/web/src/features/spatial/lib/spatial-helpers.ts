import type { SpatialSceneGraph } from "@openbeam/types/spatial";

const GUEST_SCENE_KEY = "openbeam-spatial-guest-scene";
const GUEST_SESSION_KEY = "openbeam-spatial-guest-session";

export function saveGuestScene(sceneGraph: SpatialSceneGraph): void {
  try {
    localStorage.setItem(GUEST_SCENE_KEY, JSON.stringify(sceneGraph));
  } catch {
    /* storage full */
  }
}

export function loadGuestScene(): SpatialSceneGraph | null {
  try {
    const data = localStorage.getItem(GUEST_SCENE_KEY);
    return data ? (JSON.parse(data) as SpatialSceneGraph) : null;
  } catch {
    return null;
  }
}

export function clearGuestScene(): void {
  localStorage.removeItem(GUEST_SCENE_KEY);
  localStorage.removeItem(GUEST_SESSION_KEY);
}

export function getGuestSessionId(): string {
  let id = localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}
