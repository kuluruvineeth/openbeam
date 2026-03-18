import { loadAssetUrl } from "@openbeam/spatial-core";

export const ASSETS_CDN_URL =
  process.env.NEXT_PUBLIC_SPATIAL_CDN_URL || "/spatial-assets";

export async function resolveAssetUrl(
  url: string | undefined | null
): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("asset://")) {
    return await loadAssetUrl(url);
  }

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${ASSETS_CDN_URL}${normalizedPath}`;
}

export function resolveCdnUrl(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("asset://")) {
    console.warn(
      "Use resolveAssetUrl() for asset:// URLs, not resolveCdnUrl()"
    );
    return null;
  }

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${ASSETS_CDN_URL}${normalizedPath}`;
}
