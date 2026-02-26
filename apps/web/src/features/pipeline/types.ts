export type PipelineColumn = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
};

export type PipelineCard = {
  id: string;
  title: string;
  columnId: string;
  fields: PipelineCardField[];
  tags: string[];
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
};

export type PipelineCardField = {
  name: string;
  value: string;
  type:
    | "text"
    | "number"
    | "date"
    | "enum"
    | "relation"
    | "user"
    | "email"
    | "url";
};

export type PipelineViewMode = "kanban" | "table";

export type PipelineFilterState = {
  search: string;
  tags: string[];
  assigneeIds: string[];
};

export type PipelineDragResult = {
  cardId: string;
  sourceColumnId: string;
  targetColumnId: string;
};
