export {
  filterExternalMessages,
  getExternalUsersInChannel,
  getSharedChannelInfo,
  isSharedChannel,
  listSharedChannels,
  shouldSyncSharedChannel,
  syncSharedChannel,
} from "./shared-channels";

export type {
  ConnectedTeam,
  ConnectPermission,
  ConnectSyncConfig,
  ConnectSyncResult,
  ExternalUser,
  SharedChannel,
  SharedChannelType,
} from "./types";

export {
  ConnectedTeamSchema,
  DEFAULT_CONNECT_CONFIG,
  ExternalUserSchema,
  SharedChannelSchema,
  SharedChannelTypeSchema,
} from "./types";
