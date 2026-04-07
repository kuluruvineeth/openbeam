export interface BynderCollectionCreateResult {
  collectionId: string | undefined;
  url: string | undefined;
}

export interface BynderCollectionAddAssetResult {
  collectionId: string | undefined;
  url: string | undefined;
}

export interface BynderActionResults {
  collection_create: BynderCollectionCreateResult;
  collection_add_asset: BynderCollectionAddAssetResult;
}
