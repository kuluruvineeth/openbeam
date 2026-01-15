import type {
  SlackChannel,
  SlackSearchMatch,
} from "@openplane/types/services/connectors/slack";

export interface ChannelFilterConfig {
  include?: string[];
  exclude?: string[];
  includeGroupDms?: boolean;
  includeDirectMessages?: boolean;
}

export function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*") // * -> .*
    .replace(/\?/g, "."); // ? -> .

  return new RegExp(`^${escaped}$`, "i"); // Case insensitive
}

export function matchesGlob(value: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(value);
}

export function matchesAnyGlob(value: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return true;
  }

  return patterns.some((pattern) => matchesGlob(value, pattern));
}

export function filterChannels(
  channels: SlackChannel[],
  config: ChannelFilterConfig
): SlackChannel[] {
  const {
    include = [],
    exclude = [],
    includeGroupDms = false,
    includeDirectMessages = false,
  } = config;

  return channels.filter((channel) => {
    if (channel.is_im && !includeDirectMessages) {
      return false;
    }

    if (channel.is_mpim && !includeGroupDms) {
      return false;
    }

    if (include.length > 0 && !matchesAnyGlob(channel.name, include)) {
      return false;
    }

    if (exclude.length > 0 && matchesAnyGlob(channel.name, exclude)) {
      return false;
    }

    return true;
  });
}

export function filterSearchMatches(
  matches: SlackSearchMatch[],
  config: ChannelFilterConfig
): SlackSearchMatch[] {
  return matches.filter((match) => shouldIncludeMatch(match, config));
}

function shouldIncludeMatch(
  match: SlackSearchMatch,
  config: ChannelFilterConfig
): boolean {
  const {
    include = [],
    exclude = [],
    includeGroupDms = false,
    includeDirectMessages = false,
  } = config;

  const channel = match.channel;
  if (!channel) {
    return true;
  }

  if (!passesTypeFilter(channel, includeDirectMessages, includeGroupDms)) {
    return false;
  }

  const channelName = channel.name;
  if (!channelName) {
    return true;
  }

  return passesNameFilter(channelName, include, exclude);
}

function passesTypeFilter(
  channel: { is_im?: boolean; is_mpim?: boolean },
  includeDirectMessages: boolean,
  includeGroupDms: boolean
): boolean {
  if (channel.is_im && !includeDirectMessages) {
    return false;
  }
  if (channel.is_mpim && !includeGroupDms) {
    return false;
  }
  return true;
}

function passesNameFilter(
  name: string,
  include: string[],
  exclude: string[]
): boolean {
  if (include.length > 0 && !matchesAnyGlob(name, include)) {
    return false;
  }
  if (exclude.length > 0 && matchesAnyGlob(name, exclude)) {
    return false;
  }
  return true;
}

export function buildChannelFilterQuery(config: ChannelFilterConfig): string {
  const parts: string[] = [];

  if (config.include && config.include.length > 0) {
    const exactChannels = config.include.filter(
      (p) => !(p.includes("*") || p.includes("?"))
    );

    for (const channel of exactChannels) {
      parts.push(`in:${channel}`);
    }
  }

  return parts.join(" ");
}

export function parseFilterString(filterString: string): string[] {
  if (!filterString.trim()) {
    return [];
  }

  return filterString
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function hasRestrictions(config: ChannelFilterConfig): boolean {
  return (
    (config.include && config.include.length > 0) ||
    (config.exclude && config.exclude.length > 0) ||
    config.includeGroupDms === false ||
    config.includeDirectMessages === false
  );
}

export function mergeFilterConfigs(
  ...configs: ChannelFilterConfig[]
): ChannelFilterConfig {
  const merged: ChannelFilterConfig = {
    include: [],
    exclude: [],
    includeGroupDms: true,
    includeDirectMessages: true,
  };

  for (const config of configs) {
    if (config.include) {
      merged.include = [...(merged.include ?? []), ...config.include];
    }
    if (config.exclude) {
      merged.exclude = [...(merged.exclude ?? []), ...config.exclude];
    }
    if (config.includeGroupDms === false) {
      merged.includeGroupDms = false;
    }
    if (config.includeDirectMessages === false) {
      merged.includeDirectMessages = false;
    }
  }

  return merged;
}
