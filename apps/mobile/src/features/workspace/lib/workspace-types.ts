import type {
  FieldType,
  WorkspaceEntry,
  WorkspaceObjectDefinition,
  WorkspaceQueryResult,
} from "@openplane/types/services/workspace";

export type WorkspaceViewMode = "table" | "list" | "kanban";

export type ObjectSummary = Pick<
  WorkspaceObjectDefinition,
  "id" | "name" | "description" | "icon" | "color" | "defaultView"
> & {
  fieldCount: number;
};

export type EntryFormValue = {
  fieldName: string;
  fieldType: FieldType;
  value: unknown;
  required: boolean;
};

export type NL2SQLResult = {
  sql: string;
  explanation: string;
  estimatedComplexity: "simple" | "moderate" | "complex";
  queryResult?: WorkspaceQueryResult;
};

export type { WorkspaceEntry, WorkspaceObjectDefinition, WorkspaceQueryResult };
