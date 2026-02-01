export interface ExtractEntitiesInput {
  documentId: string;
  teamId: string;
  title: string;
  content: string;
  author?: string;
  connectorType: string;
}

export interface ExtractedEntity {
  text: string;
  label: string;
  score: number;
  source: string;
}

export interface ExtractEntitiesOutput {
  documentId: string;
  entities: ExtractedEntity[];
  entityCount: number;
}

export interface SaveEntitiesInput {
  documentId: string;
  teamId: string;
  connectorType: string;
  author?: string;
  entities: ExtractedEntity[];
}

export interface SaveEntitiesOutput {
  entitiesCreated: number;
  relationsCreated: number;
}

export interface EntityExtractionActivities {
  extractEntities(input: ExtractEntitiesInput): Promise<ExtractEntitiesOutput>;
  saveEntities(input: SaveEntitiesInput): Promise<SaveEntitiesOutput>;
}
