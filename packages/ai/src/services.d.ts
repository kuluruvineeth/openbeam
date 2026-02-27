declare module "@openplane/services" {
  function getTeamDuckDB(teamId: string): Promise<unknown>;
  function initializeEAVSchema(db: unknown): Promise<void>;

  function executeQuery(
    db: unknown,
    sql: string,
    options?: {
      readOnly?: boolean;
      timeoutMs?: number;
      maxRows?: number;
    }
  ): Promise<{
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    queryTimeMs: number;
  }>;

  function getObject(
    db: unknown,
    name: string
  ): Promise<{
    id: string;
    name: string;
    fields: { name: string; type: string; required: boolean }[];
  } | null>;

  function createObject(
    db: unknown,
    params: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      defaultView?: string;
      fields: {
        name: string;
        type: string;
        required?: boolean;
        defaultValue?: string;
        enumValues?: string[];
        enumColors?: Record<string, string>;
        relatedObjectId?: string;
        relationshipType?: string;
        description?: string;
      }[];
    },
    teamId: string
  ): Promise<{
    id: string;
    name: string;
    description: string;
    fields: { name: string; type: string; required: boolean }[];
  }>;

  function listObjects(
    db: unknown,
    teamId: string
  ): Promise<
    {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      defaultView: string;
      fields: { name: string; type: string; required: boolean }[];
      immutable: boolean;
    }[]
  >;

  function createEntry(
    db: unknown,
    params: { objectId: string; values: Record<string, unknown> }
  ): Promise<{
    id: string;
    values: Record<string, unknown>;
    createdAt: string;
  }>;

  function listEntries(
    db: unknown,
    objectName: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDir?: string;
    }
  ): Promise<{
    entries: {
      id: string;
      values: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
    }[];
    total: number;
  }>;

  function updateEntry(
    db: unknown,
    objectName: string,
    entryId: string,
    data: { values: Record<string, unknown> }
  ): Promise<{
    id: string;
    values: Record<string, unknown>;
    updatedAt: string;
  }>;

  function importCSV(
    db: unknown,
    data: string,
    config: {
      format: string;
      objectName: string;
      columnMapping?: Record<string, string>;
      skipInvalidRows: boolean;
      batchSize: number;
    }
  ): Promise<{
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errors: { row: number; message: string }[];
  }>;

  function generateWorkspaceSql(params: {
    teamId: string;
    question: string;
    schema: {
      teamId: string;
      objects: {
        name: string;
        description?: string;
        fields: { name: string; type: string; required: boolean }[];
        entryCount: number;
        sampleData: Record<string, unknown>[];
      }[];
    };
  }): Promise<{
    sql: string;
    explanation: string;
    referencedColumns: string[];
    estimatedComplexity: "simple" | "moderate" | "complex";
  }>;

  function importJSON(
    db: unknown,
    records: Record<string, unknown>[],
    config: {
      format: string;
      objectName: string;
      columnMapping?: Record<string, string>;
      skipInvalidRows: boolean;
      batchSize: number;
    }
  ): Promise<{
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    errors: { row: number; message: string }[];
  }>;
}
