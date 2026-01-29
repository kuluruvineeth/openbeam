"use client";

import type {
  DatabaseEngine,
  DatabaseOperation,
  DatabaseQueryNodeConfig,
  QueryBatchMode,
  QueryOutputFormat,
  QueryParameter,
} from "@openplane/types/canvas";
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

interface DatabaseQueryConfigPanelProps {
  config: DatabaseQueryNodeConfig;
  onChange: (config: Partial<DatabaseQueryNodeConfig>) => void;
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
        </div>
      );
    }
  )
);

DatabaseQueryConfigPanel.displayName = "DatabaseQueryConfigPanel";
