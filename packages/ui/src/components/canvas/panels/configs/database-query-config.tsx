"use client";

import type {
  DatabaseEngine,
  DatabaseOperation,
  DatabaseQueryNodeConfig,
  QueryBatchMode,
  QueryOutputFormat,
  QueryParameter,
} from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import {
  ConnectionSelector,
  ExecutionSection,
  OperationSelector,
  ParameterEditor,
  QueryEditor,
  StructuredFields,
} from "../../db-elements";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface DatabaseQueryConfigPanelProps {
  config: DatabaseQueryNodeConfig;
  onChange: (config: Partial<DatabaseQueryNodeConfig>) => void;
}

const SUPPORTED_ENGINES = new Set<DatabaseEngine>([
  "postgresql",
  "mysql",
  "mariadb",
]);

const OUTPUT_LABELS: Record<QueryOutputFormat, string> = {
  rows: "All Rows",
  first_row: "First Row",
  count: "Count",
  raw: "Raw Result",
};

const READ_ONLY_PREFIXES = new Set([
  "select",
  "with",
  "show",
  "describe",
  "explain",
  "pragma",
]);
const LEADING_KEYWORD_REGEX = /^([a-zA-Z]+)/;

function stripLeadingComments(sql: string): string {
  let text = sql.trimStart();
  while (text.startsWith("--") || text.startsWith("/*")) {
    if (text.startsWith("--")) {
      const newline = text.indexOf("\n");
      if (newline === -1) {
        return "";
      }
      text = text.slice(newline + 1).trimStart();
      continue;
    }
    const end = text.indexOf("*/");
    if (end === -1) {
      return "";
    }
    text = text.slice(end + 2).trimStart();
  }
  return text;
}

function isReadOnlyQuery(sql: string): boolean {
  const stripped = stripLeadingComments(sql);
  if (!stripped) {
    return false;
  }
  const match = stripped.match(LEADING_KEYWORD_REGEX);
  if (!match) {
    return false;
  }
  return READ_ONLY_PREFIXES.has(match[1]?.toLowerCase() ?? "");
}

function hasMultipleStatements(sql: string): boolean {
  const trimmed = sql.trim();
  if (!trimmed) {
    return false;
  }
  const withoutTrailing = trimmed.endsWith(";")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  if (!withoutTrailing) {
    return false;
  }
  return withoutTrailing.includes(";");
}

function buildWarnings(config: DatabaseQueryNodeConfig): string[] {
  const warnings: string[] = [];
  const operation = config.operation ?? "execute_query";
  const engine = config.engine ?? "postgresql";
  const connectionId = config.connectionId?.trim() ?? "";
  const query = config.query ?? "";
  const readOnly = config.readOnly ?? true;

  if (!connectionId) {
    warnings.push("Connection ID is required");
  }

  if (!SUPPORTED_ENGINES.has(engine)) {
    warnings.push(`Engine ${engine} is not supported`);
  }

  if (operation === "execute_query") {
    if (query.trim()) {
      if (hasMultipleStatements(query)) {
        warnings.push("Multiple statements are not supported");
      }
      if (readOnly && !isReadOnlyQuery(query)) {
        warnings.push("Read-only mode blocks write queries");
      }
    } else {
      warnings.push("Query is required");
    }
  } else {
    if (!config.table?.trim()) {
      warnings.push("Table is required");
    }
    if (operation === "upsert" && !config.conflictColumn?.trim()) {
      warnings.push("Conflict column is required");
    }
    if (readOnly && operation !== "select") {
      warnings.push("Read-only mode blocks write operations");
    }
    if (
      (operation === "update" || operation === "delete") &&
      !config.whereClause?.trim()
    ) {
      warnings.push("Missing WHERE clause will affect all rows");
    }
  }

  if (config.maxRows !== undefined && config.maxRows < 1) {
    warnings.push("Max rows must be at least 1");
  }

  return warnings;
}

function buildNotes(config: DatabaseQueryNodeConfig): string[] {
  const notes: string[] = [];
  const operation = config.operation ?? "execute_query";
  const batchMode = config.batchMode ?? "single";
  const outputFormat = config.outputFormat ?? "rows";
  const readOnly = config.readOnly ?? true;
  const values = config.values ?? {};

  if (batchMode !== "single") {
    notes.push(`Batch mode: ${batchMode}`);
  }

  if (outputFormat !== "rows") {
    notes.push(`Output: ${OUTPUT_LABELS[outputFormat]}`);
  }

  if (readOnly) {
    notes.push("Read-only enabled");
  }

  if (
    (operation === "insert" ||
      operation === "update" ||
      operation === "upsert") &&
    Object.keys(values).length === 0
  ) {
    notes.push("Values default to input payload");
  }

  if (operation === "select" && !config.whereClause?.trim()) {
    notes.push("No WHERE clause; query may scan full table");
  }

  if (config.continueOnError) {
    notes.push("Continue on error enabled");
  }

  return notes;
}

export const DatabaseQueryConfigPanel = memo(
  forwardRef<HTMLDivElement, DatabaseQueryConfigPanelProps>(
    function DatabaseQueryConfigPanelComponent({ config, onChange }, ref) {
      const operation = config.operation ?? "execute_query";
      const engine = config.engine ?? "postgresql";
      const parameters = config.parameters ?? [];
      const timeout = config.timeout ?? 30_000;
      const readOnly = config.readOnly ?? true;
      const maxRows = config.maxRows ?? 1000;
      const batchMode = config.batchMode ?? "single";
      const outputFormat = config.outputFormat ?? "rows";
      const continueOnError = config.continueOnError ?? false;

      const isRawQuery = operation === "execute_query";

      const handleConnectionChange = useCallback(
        (updates: { connectionId?: string; engine?: DatabaseEngine }) => {
          onChange(updates);
        },
        [onChange]
      );

      const handleOperationChange = useCallback(
        (op: DatabaseOperation) => {
          onChange({ operation: op });
        },
        [onChange]
      );

      const handleQueryChange = useCallback(
        (query: string) => {
          onChange({ query });
        },
        [onChange]
      );

      const handleParametersChange = useCallback(
        (params: QueryParameter[]) => {
          onChange({ parameters: params });
        },
        [onChange]
      );

      const handleStructuredChange = useCallback(
        (updates: {
          table?: string;
          columns?: string[];
          whereClause?: string;
          orderBy?: string;
          values?: Record<string, string>;
          conflictColumn?: string;
        }) => {
          onChange(updates);
        },
        [onChange]
      );

      const handleExecutionChange = useCallback(
        (updates: {
          timeout?: number;
          readOnly?: boolean;
          maxRows?: number;
          batchMode?: QueryBatchMode;
          outputFormat?: QueryOutputFormat;
          continueOnError?: boolean;
        }) => {
          onChange(updates);
        },
        [onChange]
      );

      const paramBadge = useMemo(
        () => (parameters.length > 0 ? `${parameters.length}` : undefined),
        [parameters.length]
      );
      const warnings = useMemo(() => buildWarnings(config), [config]);
      const notes = useMemo(() => buildNotes(config), [config]);

      return (
        <div
          className="min-w-0 divide-y divide-border/50 overflow-hidden"
          ref={ref}
        >
          <ConfigSection
            defaultOpen
            icon={<Icons.Database className="size-4" />}
            title="Connection"
          >
            <ConnectionSelector
              connectionId={config.connectionId ?? ""}
              engine={engine}
              onChange={handleConnectionChange}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Layers className="size-4" />}
            title="Operation"
          >
            <OperationSelector
              onChange={handleOperationChange}
              value={operation}
            />
          </ConfigSection>

          <AnimatedSizeContainer height>
            {isRawQuery && (
              <ConfigSection
                defaultOpen
                icon={<Icons.Code className="size-4" />}
                title="Query"
              >
                <QueryEditor
                  engine={engine}
                  onChange={handleQueryChange}
                  query={config.query ?? ""}
                />
              </ConfigSection>
            )}
          </AnimatedSizeContainer>

          <AnimatedSizeContainer height>
            {!isRawQuery && (
              <ConfigSection
                defaultOpen
                icon={<Icons.Table className="size-4" />}
                title="Fields"
              >
                <StructuredFields
                  columns={config.columns}
                  conflictColumn={config.conflictColumn}
                  onChange={handleStructuredChange}
                  operation={operation}
                  orderBy={config.orderBy}
                  table={config.table}
                  values={config.values}
                  whereClause={config.whereClause}
                />
              </ConfigSection>
            )}
          </AnimatedSizeContainer>

          <ConfigSection
            badge={paramBadge}
            defaultOpen={false}
            icon={<Icons.Settings className="size-4" />}
            title="Parameters"
          >
            <ParameterEditor
              onChange={handleParametersChange}
              parameters={parameters}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Play className="size-4" />}
            title="Execution"
          >
            <ExecutionSection
              batchMode={batchMode}
              continueOnError={continueOnError}
              maxRows={maxRows}
              onChange={handleExecutionChange}
              outputFormat={outputFormat}
              readOnly={readOnly}
              timeout={timeout}
            />
          </ConfigSection>

          <WarningsList items={warnings} />
          <NotesList items={notes} />
        </div>
      );
    }
  )
);

DatabaseQueryConfigPanel.displayName = "DatabaseQueryConfigPanel";
