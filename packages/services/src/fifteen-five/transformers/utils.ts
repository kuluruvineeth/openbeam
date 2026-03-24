import type { FifteenFiveUser } from "../api/users";

export function getUserName(
  userId: number | null,
  userLookup: Map<number, FifteenFiveUser>
): string | undefined {
  if (userId === null) {
    return;
  }
  const user = userLookup.get(userId);
  if (!user) {
    return;
  }
  return `${user.first_name} ${user.last_name}`.trim();
}

export function getUserEmail(
  userId: number | null,
  userLookup: Map<number, FifteenFiveUser>
): string | undefined {
  if (userId === null) {
    return;
  }
  return userLookup.get(userId)?.email;
}

export function buildFifteenFiveUrl(path: string): string {
  return `https://my.15five.com${path}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
