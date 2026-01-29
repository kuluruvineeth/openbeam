import { z } from "zod";
import {
  type ConnectorEventConfig,
  defineConnectorEvents,
} from "../common/events";

export const SLACK_EVENT_IDS = [
  "message.created",
  "message.updated",
  "message.deleted",
  "reaction.added",
  "reaction.removed",
  "channel.created",
  "channel.renamed",
  "channel.archived",
  "channel.unarchived",
  "channel.deleted",
  "member.joined",
  "member.left",
  "file.shared",
  "file.deleted",
  "app.mention",
  "link.shared",
  "emoji.changed",
  "pin.added",
  "pin.removed",
  "star.added",
] as const;

export type SlackEventId = (typeof SLACK_EVENT_IDS)[number];

export const SLACK_EVENTS = defineConnectorEvents<
  SlackEventId,
  readonly ConnectorEventConfig<SlackEventId>[]
>([
  {
    id: "message.created",
    name: "Message Created",
    description: "Triggered when a new message is posted in a channel",
    category: "messages",
    isRealtime: true,
  },
  {
    id: "message.updated",
    name: "Message Updated",
    description: "Triggered when a message is edited",
    category: "messages",
    isRealtime: true,
  },
  {
    id: "message.deleted",
    name: "Message Deleted",
    description: "Triggered when a message is deleted",
    category: "messages",
    isRealtime: true,
  },
  {
    id: "reaction.added",
    name: "Reaction Added",
    description: "Triggered when a reaction emoji is added to a message",
    category: "reactions",
    isRealtime: true,
  },
  {
    id: "reaction.removed",
    name: "Reaction Removed",
    description: "Triggered when a reaction emoji is removed from a message",
    category: "reactions",
    isRealtime: true,
  },
  {
    id: "channel.created",
    name: "Channel Created",
    description: "Triggered when a new channel is created",
    category: "channels",
    isRealtime: true,
  },
  {
    id: "channel.renamed",
    name: "Channel Renamed",
    description: "Triggered when a channel is renamed",
    category: "channels",
    isRealtime: true,
  },
  {
    id: "channel.archived",
    name: "Channel Archived",
    description: "Triggered when a channel is archived",
    category: "channels",
    isRealtime: true,
  },
  {
    id: "channel.unarchived",
    name: "Channel Unarchived",
    description: "Triggered when an archived channel is unarchived",
    category: "channels",
    isRealtime: true,
  },
  {
    id: "channel.deleted",
    name: "Channel Deleted",
    description: "Triggered when a channel is deleted",
    category: "channels",
    isRealtime: true,
  },
  {
    id: "member.joined",
    name: "Member Joined Channel",
    description: "Triggered when a user joins a channel",
    category: "users",
    isRealtime: true,
  },
  {
    id: "member.left",
    name: "Member Left Channel",
    description: "Triggered when a user leaves a channel",
    category: "users",
    isRealtime: true,
  },
  {
    id: "file.shared",
    name: "File Shared",
    description: "Triggered when a file is shared in a channel",
    category: "files",
    isRealtime: true,
  },
  {
    id: "file.deleted",
    name: "File Deleted",
    description: "Triggered when a file is deleted",
    category: "files",
    isRealtime: true,
  },
  {
    id: "app.mention",
    name: "App Mentioned",
    description: "Triggered when your app is mentioned in a message",
    category: "messages",
    isRealtime: true,
  },
  {
    id: "link.shared",
    name: "Link Shared",
    description: "Triggered when a URL is shared in a channel",
    category: "messages",
    isRealtime: true,
  },
  {
    id: "emoji.changed",
    name: "Emoji Changed",
    description: "Triggered when custom emoji is added or removed",
    category: "other",
    isRealtime: true,
  },
  {
    id: "pin.added",
    name: "Pin Added",
    description: "Triggered when a message is pinned",
    category: "messages",
    isRealtime: true,
  },
  {
    id: "pin.removed",
    name: "Pin Removed",
    description: "Triggered when a message is unpinned",
    category: "messages",
    isRealtime: true,
  },
  {
    id: "star.added",
    name: "Star Added",
    description: "Triggered when an item is starred",
    category: "messages",
    isRealtime: true,
  },
]);

export const SlackEventIdSchema = z.enum(SLACK_EVENT_IDS);
