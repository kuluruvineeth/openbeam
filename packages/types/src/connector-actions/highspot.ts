export interface HighspotItemUpdateMetadataResult {
  itemId: string | undefined;
  url: string | undefined;
}

export interface HighspotPitchCreateResult {
  pitchId: string | undefined;
  url: string | undefined;
}

export interface HighspotActionResults {
  item_update_metadata: HighspotItemUpdateMetadataResult;
  pitch_create: HighspotPitchCreateResult;
}
