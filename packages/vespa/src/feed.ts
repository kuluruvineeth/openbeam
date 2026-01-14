import type { BatchFailure, BatchResult } from "./batcher";
import { vespaBatcher } from "./batcher";
import { vespaClient } from "./client";
import type { FeedResponse, GenericDocument } from "./schemas";

export type FeedApprovalLevel = "auto" | "review" | "explicit";

export interface FeedValidationResult {
  valid: boolean;
  errors: FeedValidationError[];
  warnings: FeedValidationWarning[];
}

export interface FeedValidationError {
  field: string;
  message: string;
  code: "REQUIRED" | "INVALID_FORMAT" | "TOO_LONG" | "INVALID_TYPE";
}

export interface FeedValidationWarning {
  field: string;
  message: string;
  code: "MISSING_OPTIONAL" | "SUBOPTIMAL" | "DEPRECATED";
}

export interface FeedOperationParams {
  documents: GenericDocument[];
  approvalLevel?: FeedApprovalLevel;
  validateOnly?: boolean;
  skipValidation?: boolean;
  batchSize?: number;
}

export interface FeedOperationResult {
  success: boolean;
  validation: FeedValidationResult;
  feedResult?: BatchResult;
  approvalRequired: boolean;
  operationId: string;
  documentCount: number;
  timing: {
    validationMs: number;
    feedMs: number;
    totalMs: number;
  };
}

export interface PendingFeedOperation {
  operationId: string;
  documents: GenericDocument[];
  validation: FeedValidationResult;
  createdAt: number;
  expiresAt: number;
  status: "pending" | "approved" | "rejected" | "expired";
}

const REQUIRED_FIELDS: (keyof GenericDocument)[] = [
  "id",
  "connector_id",
  "connector_type",
  "team_id",
  "workspace_id",
  "external_id",
  "document_type",
  "title",
  "content",
  "created_at",
  "updated_at",
  "is_public",
];

const MAX_CONTENT_LENGTH = 1_000_000;
const MAX_TITLE_LENGTH = 1000;

function validateDocument(doc: GenericDocument): FeedValidationError[] {
  const errors: FeedValidationError[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = doc[field];
    if (value === undefined || value === null || value === "") {
      errors.push({
        field,
        message: `${field} is required`,
        code: "REQUIRED",
      });
    }
  }

  if (doc.content && doc.content.length > MAX_CONTENT_LENGTH) {
    errors.push({
      field: "content",
      message: `content exceeds maximum length of ${MAX_CONTENT_LENGTH}`,
      code: "TOO_LONG",
    });
  }

  if (doc.title && doc.title.length > MAX_TITLE_LENGTH) {
    errors.push({
      field: "title",
      message: `title exceeds maximum length of ${MAX_TITLE_LENGTH}`,
      code: "TOO_LONG",
    });
  }

  if (doc.created_at && typeof doc.created_at !== "number") {
    errors.push({
      field: "created_at",
      message: "created_at must be a unix timestamp",
      code: "INVALID_TYPE",
    });
  }

  if (doc.updated_at && typeof doc.updated_at !== "number") {
    errors.push({
      field: "updated_at",
      message: "updated_at must be a unix timestamp",
      code: "INVALID_TYPE",
    });
  }

  return errors;
}

function checkDocumentWarnings(doc: GenericDocument): FeedValidationWarning[] {
  const warnings: FeedValidationWarning[] = [];

  if (!(doc.embedding || doc.content_embedding)) {
    warnings.push({
      field: "embedding",
      message: "Document has no embeddings; semantic search will not work",
      code: "MISSING_OPTIONAL",
    });
  }

  if (!doc.url) {
    warnings.push({
      field: "url",
      message: "Document has no URL; users cannot navigate to source",
      code: "MISSING_OPTIONAL",
    });
  }

  if (!(doc.author_name || doc.author_id)) {
    warnings.push({
      field: "author_name",
      message: "Document has no author information",
      code: "MISSING_OPTIONAL",
    });
  }

  if (doc.content && doc.content.length < 50) {
    warnings.push({
      field: "content",
      message: "Content is very short; search relevance may be reduced",
      code: "SUBOPTIMAL",
    });
  }

  return warnings;
}

function validateDocuments(documents: GenericDocument[]): FeedValidationResult {
  const allErrors: FeedValidationError[] = [];
  const allWarnings: FeedValidationWarning[] = [];

  for (const doc of documents) {
    const errors = validateDocument(doc);
    const warnings = checkDocumentWarnings(doc);

    for (const error of errors) {
      allErrors.push({
        ...error,
        field: `${doc.id}.${error.field}`,
      });
    }

    for (const warning of warnings) {
      allWarnings.push({
        ...warning,
        field: `${doc.id}.${warning.field}`,
      });
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

function generateOperationId(): string {
  return `feed_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function determineApprovalRequired(
  approvalLevel: FeedApprovalLevel,
  documentCount: number,
  validation: FeedValidationResult
): boolean {
  if (approvalLevel === "auto") {
    return false;
  }

  if (approvalLevel === "explicit") {
    return true;
  }

  return documentCount > 100 || validation.warnings.length > 10;
}

export async function feedDocuments(
  params: FeedOperationParams
): Promise<FeedOperationResult> {
  const startTime = performance.now();
  const operationId = generateOperationId();
  const approvalLevel = params.approvalLevel ?? "auto";

  let validation: FeedValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };
  let validationMs = 0;

  if (!params.skipValidation) {
    const validationStart = performance.now();
    validation = validateDocuments(params.documents);
    validationMs = performance.now() - validationStart;

    if (!validation.valid) {
      return {
        success: false,
        validation,
        approvalRequired: false,
        operationId,
        documentCount: params.documents.length,
        timing: {
          validationMs,
          feedMs: 0,
          totalMs: performance.now() - startTime,
        },
      };
    }
  }

  if (params.validateOnly) {
    return {
      success: validation.valid,
      validation,
      approvalRequired: false,
      operationId,
      documentCount: params.documents.length,
      timing: {
        validationMs,
        feedMs: 0,
        totalMs: performance.now() - startTime,
      },
    };
  }

  const approvalRequired = determineApprovalRequired(
    approvalLevel,
    params.documents.length,
    validation
  );

  if (approvalRequired) {
    return {
      success: true,
      validation,
      approvalRequired: true,
      operationId,
      documentCount: params.documents.length,
      timing: {
        validationMs,
        feedMs: 0,
        totalMs: performance.now() - startTime,
      },
    };
  }

  const feedStart = performance.now();
  const feedResult = await vespaBatcher.addManyWithResult(params.documents);
  const feedMs = performance.now() - feedStart;

  await vespaBatcher.forceFlush();

  return {
    success: feedResult.successRate >= 0.95,
    validation,
    feedResult,
    approvalRequired: false,
    operationId,
    documentCount: params.documents.length,
    timing: {
      validationMs,
      feedMs,
      totalMs: performance.now() - startTime,
    },
  };
}

export async function feedSingleDocument(
  document: GenericDocument,
  options?: { skipValidation?: boolean }
): Promise<{
  success: boolean;
  response?: FeedResponse;
  validation: FeedValidationResult;
  error?: string;
}> {
  let validation: FeedValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!options?.skipValidation) {
    validation = validateDocuments([document]);

    if (!validation.valid) {
      return {
        success: false,
        validation,
        error: validation.errors.map((e) => e.message).join("; "),
      };
    }
  }

  try {
    const response = await vespaClient.feedDocument(document);
    return {
      success: true,
      response,
      validation,
    };
  } catch (error) {
    return {
      success: false,
      validation,
      error: error instanceof Error ? error.message : "Unknown feed error",
    };
  }
}

export interface UpdateDocumentParams {
  documentId: string;
  fields: Partial<GenericDocument>;
  validateFields?: boolean;
}

export async function updateDocumentFields(
  params: UpdateDocumentParams
): Promise<{
  success: boolean;
  response?: FeedResponse;
  error?: string;
}> {
  try {
    const response = await vespaClient.partialUpdateDocument(
      params.documentId,
      params.fields as Record<string, unknown>
    );
    return {
      success: true,
      response,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown update error",
    };
  }
}

export interface BulkUpdateParams {
  updates: Array<{ id: string; fields: Partial<GenericDocument> }>;
  concurrency?: number;
}

export interface BulkUpdateResult {
  succeeded: string[];
  failed: BatchFailure[];
  totalProcessed: number;
  successRate: number;
}

function processSettledBulkResult(
  settledResult: PromiseSettledResult<{
    id: string;
    result: { success: boolean; error?: string };
  }>,
  succeeded: string[],
  failed: BatchFailure[]
): void {
  if (settledResult.status === "fulfilled") {
    const { id, result } = settledResult.value;
    if (result.success) {
      succeeded.push(id);
    } else {
      failed.push({
        documentId: id,
        error: result.error ?? "Update failed",
        retryable: true,
      });
    }
  } else {
    failed.push({
      documentId: "unknown",
      error: settledResult.reason?.message ?? "Unknown error",
      retryable: true,
    });
  }
}

export async function bulkUpdateDocuments(
  params: BulkUpdateParams
): Promise<BulkUpdateResult> {
  const concurrency = params.concurrency ?? 10;
  const succeeded: string[] = [];
  const failed: BatchFailure[] = [];

  for (let i = 0; i < params.updates.length; i += concurrency) {
    const batch = params.updates.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (update) => {
        const result = await updateDocumentFields({
          documentId: update.id,
          fields: update.fields,
        });
        return { id: update.id, result };
      })
    );

    for (const settledResult of results) {
      processSettledBulkResult(settledResult, succeeded, failed);
    }
  }

  const totalProcessed = params.updates.length;
  const successRate =
    totalProcessed > 0 ? succeeded.length / totalProcessed : 0;

  return {
    succeeded,
    failed,
    totalProcessed,
    successRate,
  };
}

export async function deleteDocumentById(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await vespaClient.deleteDocument(documentId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown delete error",
    };
  }
}

export async function deleteDocumentsByConnector(
  connectorId: string
): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const result = await vespaClient.deleteByConnectorId(
      connectorId,
      "openplane_document"
    );
    return {
      success: true,
      deleted: result.deleted,
    };
  } catch (error) {
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : "Unknown delete error",
    };
  }
}

export { validateDocuments, validateDocument, checkDocumentWarnings };
