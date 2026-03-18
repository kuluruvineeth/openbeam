import { get, set } from "idb-keyval";

export const ASSET_PREFIX = "openbeam-spatial-assets:";

const urlCache = new Map<string, string>();

export async function saveAsset(file: File): Promise<string> {
  const id = crypto.randomUUID();
  await set(`${ASSET_PREFIX}${id}`, file);
  return `asset://${id}`;
}

export async function loadAssetUrl(url: string): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (url.startsWith("blob:") || url.startsWith("http")) {
    return url;
  }

  if (url.startsWith("asset://")) {
    const id = url.replace("asset://", "");

    const cached = urlCache.get(id);
    if (cached) {
      return cached;
    }

    try {
      const file = await get<File | Blob>(`${ASSET_PREFIX}${id}`);
      if (!file) {
        console.warn(`Asset not found: ${id}`);
        return null;
      }
      const objectUrl = URL.createObjectURL(file);
      urlCache.set(id, objectUrl);
      return objectUrl;
    } catch (error) {
      console.error("Failed to load asset:", error);
      return null;
    }
  }

  return url;
}
