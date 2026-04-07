export interface JfrogArtifactCopyResult {
  id: string | undefined;
  url: string | undefined;
}

export interface JfrogArtifactDeleteResult {
  id: string | undefined;
}

export interface JfrogArtifactSetPropertiesResult {
  id: string | undefined;
}

export interface JfrogActionResults {
  artifact_copy: JfrogArtifactCopyResult;
  artifact_delete: JfrogArtifactDeleteResult;
  artifact_set_properties: JfrogArtifactSetPropertiesResult;
}
