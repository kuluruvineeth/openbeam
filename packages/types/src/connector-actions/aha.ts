export interface AhaFeatureCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface AhaIdeaCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface AhaIdeaUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface AhaActionResults {
  feature_create: AhaFeatureCreateResult;
  idea_create: AhaIdeaCreateResult;
  idea_update: AhaIdeaUpdateResult;
}
