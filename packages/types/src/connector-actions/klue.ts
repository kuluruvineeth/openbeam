export interface KlueIntelCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface KlueIntelUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface KlueActionResults {
  intel_create: KlueIntelCreateResult;
  intel_update: KlueIntelUpdateResult;
}
