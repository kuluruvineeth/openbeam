const SLACK_USER_MENTION_REGEX = /<@([A-Z0-9]+)(?:\|([^>]+))?>/g;
const SLACK_CHANNEL_REGEX = /<#([A-Z0-9]+)(?:\|([^>]+))?>/g;
const SLACK_LINK_REGEX = /<(https?:\/\/[^|>]+)(?:\|([^>]+))?>/g;
const SLACK_BOLD_REGEX = /\*([^*]+)\*/g;
const SLACK_ITALIC_REGEX = /_([^_]+)_/g;
const SLACK_STRIKE_REGEX = /~([^~]+)~/g;
const SLACK_CODE_REGEX = /`([^`]+)`/g;
const SLACK_CODE_BLOCK_REGEX = /```([^`]+)```/g;

export function formatSlackText(text: string): string {
  let formatted = text;

  formatted = formatted.replace(
    SLACK_CODE_BLOCK_REGEX,
    '<pre class="bg-foreground/5 p-2 rounded text-xs overflow-x-auto">$1</pre>'
  );

  formatted = formatted.replace(
    SLACK_CODE_REGEX,
    '<code class="bg-foreground/5 px-1 rounded text-xs">$1</code>'
  );

  formatted = formatted.replace(
    SLACK_USER_MENTION_REGEX,
    (_match, _userId, displayName) => {
      const name = displayName || "user";
      return `<span class="text-blue-500 font-medium">@${name}</span>`;
    }
  );

  formatted = formatted.replace(
    SLACK_CHANNEL_REGEX,
    (_match, _channelId, channelName) => {
      const name = channelName || "channel";
      return `<span class="text-blue-500 font-medium">#${name}</span>`;
    }
  );

  formatted = formatted.replace(SLACK_LINK_REGEX, (_match, url, label) => {
    const displayText = label || url;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${displayText}</a>`;
  });

  formatted = formatted.replace(SLACK_BOLD_REGEX, "<strong>$1</strong>");
  formatted = formatted.replace(SLACK_ITALIC_REGEX, "<em>$1</em>");
  formatted = formatted.replace(SLACK_STRIKE_REGEX, "<del>$1</del>");

  formatted = formatted.replace(/\n/g, "<br>");

  return formatted;
}

export function parseEmailParticipants(
  toHeader?: string[],
  ccHeader?: string[]
): { to: string[]; cc: string[] } {
  return {
    to: toHeader ?? [],
    cc: ccHeader ?? [],
  };
}

export function formatThreadTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "just now";
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatMessageDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
