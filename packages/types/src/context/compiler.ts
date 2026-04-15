export interface CompilationJob {
  id: string;
  teamId: string;
  topic: string;
  category: string;
  sourceUris: string[];
  status:
    | "pending"
    | "gathering"
    | "synthesizing"
    | "storing"
    | "completed"
    | "failed";
  progress: number;
  error?: string;
  createdAt: Date;
}

export interface CompilationResult {
  articleUri: string;
  title: string;
  abstractText: string;
  sourceCount: number;
  claimCount: number;
  overallConfidence: number;
  tokensSaved: number;
}

export interface SourceContribution {
  sourceUri: string;
  connectorType: string;
  title: string;
  claimCount: number;
  confidence: number;
}

export interface ProvenanceChain {
  articleUri: string;
  sources: SourceContribution[];
  overallConfidence: number;
  compiledAt: Date;
}
