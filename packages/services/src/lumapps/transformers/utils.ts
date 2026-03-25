export function buildLumAppsContentUrl(contentId: string): string {
  return `https://sites.lumapps.com/content/${contentId}`;
}

export function buildLumAppsCommunityUrl(communityId: string): string {
  return `https://sites.lumapps.com/community/${communityId}`;
}

export function buildLumAppsPostUrl(
  communityId: string,
  postId: string
): string {
  return `https://sites.lumapps.com/community/${communityId}/post/${postId}`;
}

export function buildLumAppsSpaceUrl(spaceId: string): string {
  return `https://sites.lumapps.com/space/${spaceId}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
