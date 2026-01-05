export interface OutlineNode {
  id: string;
  title: string;
  level: number;
  pageStart?: number;
  pageEnd?: number;
  charStart?: number;
  charEnd?: number;
  children: OutlineNode[];
}

export interface DocumentStructure {
  hasToc: boolean;
  outline: OutlineNode[];
  totalSections: number;
  maxDepth: number;
  outlineHash: string;
}

export interface StructuredChunk {
  index: number;
  text: string;
  pageNumber?: number;
  pageEnd?: number;
  sectionId?: string;
  sectionTitle?: string;
  sectionPath: string[];
  sectionLevel?: number;
  elementTypes: string[];
}

export interface StructuredParseResult {
  structure: DocumentStructure;
  chunks: StructuredChunk[];
}
