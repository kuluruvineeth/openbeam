import { z } from "zod";

export const FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "url",
  "number",
  "currency",
  "percent",
  "boolean",
  "date",
  "datetime",
  "enum",
  "multi_enum",
  "relation",
  "user",
  "file",
  "richtext",
] as const;

export const FieldTypeSchema = z.enum(FIELD_TYPES);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const RelationshipTypeSchema = z.enum(["many_to_one", "many_to_many"]);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const WorkspaceFieldDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(128),
  type: FieldTypeSchema,
  required: z.boolean().optional().default(false),
  defaultValue: z.string().optional(),
  enumValues: z.array(z.string()).optional(),
  enumColors: z.record(z.string(), z.string()).optional(),
  enumMultiple: z.boolean().optional(),
  relatedObjectId: z.string().optional(),
  relationshipType: RelationshipTypeSchema.optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  description: z.string().optional(),
});

export type WorkspaceFieldDefinition = z.infer<
  typeof WorkspaceFieldDefinitionSchema
>;

export const WorkspaceObjectDefinitionSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  defaultView: z
    .enum(["table", "kanban", "list", "grid"])
    .optional()
    .default("table"),
  displayField: z.string().optional(),
  immutable: z.boolean().optional().default(false),
  fields: z.array(WorkspaceFieldDefinitionSchema),
  teamId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkspaceObjectDefinition = z.infer<
  typeof WorkspaceObjectDefinitionSchema
>;

export const CreateObjectInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  defaultView: z.enum(["table", "kanban", "list", "grid"]).optional(),
  fields: z.array(
    z.object({
      name: z.string().min(1).max(128),
      type: FieldTypeSchema,
      required: z.boolean().optional(),
      defaultValue: z.string().optional(),
      enumValues: z.array(z.string()).optional(),
      enumColors: z.record(z.string(), z.string()).optional(),
      relatedObjectId: z.string().optional(),
      relationshipType: RelationshipTypeSchema.optional(),
      description: z.string().optional(),
    })
  ),
});

export type CreateObjectInput = z.infer<typeof CreateObjectInputSchema>;

export const UpdateObjectInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  defaultView: z.enum(["table", "kanban", "list", "grid"]).optional(),
  displayField: z.string().optional(),
});

export type UpdateObjectInput = z.infer<typeof UpdateObjectInputSchema>;

export const WorkspaceEntrySchema = z.object({
  id: z.string(),
  objectId: z.string(),
  values: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkspaceEntry = z.infer<typeof WorkspaceEntrySchema>;

export const CreateEntryInputSchema = z.object({
  objectId: z.string(),
  values: z.record(z.string(), z.unknown()),
});

export type CreateEntryInput = z.infer<typeof CreateEntryInputSchema>;

export const UpdateEntryInputSchema = z.object({
  values: z.record(z.string(), z.unknown()),
});

export type UpdateEntryInput = z.infer<typeof UpdateEntryInputSchema>;

export const BulkCreateEntriesInputSchema = z.object({
  objectId: z.string(),
  entries: z.array(z.record(z.string(), z.unknown())),
});

export type BulkCreateEntriesInput = z.infer<
  typeof BulkCreateEntriesInputSchema
>;

export const BulkDeleteEntriesInputSchema = z.object({
  entryIds: z.array(z.string()).min(1),
});

export type BulkDeleteEntriesInput = z.infer<
  typeof BulkDeleteEntriesInputSchema
>;

export const WorkspaceQueryResultSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  columns: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
    })
  ),
  rowCount: z.number(),
  queryTimeMs: z.number(),
});

export type WorkspaceQueryResult = z.infer<typeof WorkspaceQueryResultSchema>;

export const ImportFormatSchema = z.enum(["csv", "json", "parquet"]);
export type ImportFormat = z.infer<typeof ImportFormatSchema>;

export const ExportFormatSchema = z.enum(["csv", "json", "parquet"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const WorkspaceImportConfigSchema = z.object({
  format: ImportFormatSchema,
  objectName: z.string(),
  columnMapping: z.record(z.string(), z.string()).optional(),
  createMissingFields: z.boolean().optional().default(false),
  skipInvalidRows: z.boolean().optional().default(true),
  batchSize: z.number().int().min(1).max(10_000).optional().default(500),
});

export type WorkspaceImportConfig = z.infer<typeof WorkspaceImportConfigSchema>;

export const WorkspaceImportResultSchema = z.object({
  totalRows: z.number(),
  importedRows: z.number(),
  skippedRows: z.number(),
  errors: z.array(
    z.object({
      row: z.number(),
      field: z.string().optional(),
      message: z.string(),
    })
  ),
});

export type WorkspaceImportResult = z.infer<typeof WorkspaceImportResultSchema>;

export const WorkspaceExportConfigSchema = z.object({
  format: ExportFormatSchema,
  objectName: z.string(),
  fields: z.array(z.string()).optional(),
  filter: z.string().optional(),
  limit: z.number().int().min(1).max(100_000).optional(),
});

export type WorkspaceExportConfig = z.infer<typeof WorkspaceExportConfigSchema>;

export type WorkspaceRelation = {
  id: string;
  sourceObjectId: string;
  sourceFieldId: string;
  targetObjectId: string;
  relationshipType: RelationshipType;
};
