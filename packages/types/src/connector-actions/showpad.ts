export interface ShowpadChannelCreateResult {
  channelId: string | undefined;
  url: string | undefined;
}

export interface ShowpadAssetUpdateMetadataResult {
  assetId: string | undefined;
  url: string | undefined;
}

export interface ShowpadActionResults {
  channel_create: ShowpadChannelCreateResult;
  asset_update_metadata: ShowpadAssetUpdateMetadataResult;
}
