"use client";

import type {
  GraphqlMethod,
  GraphqlOperationType,
  GraphqlQueryNodeConfig,
  HttpAuthConfig,
  KeyValuePair,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import {
  EndpointBar,
  ExecutionSettings,
  OperationTypeSelector,
  QueryEditor,
  VariablesEditor,
} from "../../graphql-elements";
import { AuthSection, HeaderEditor } from "../../http-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";
import { NotesList, WarningsList } from "../feedback-lists";

interface GraphqlQueryConfigPanelProps {
  config: GraphqlQueryNodeConfig;
  onChange: (config: Partial<GraphqlQueryNodeConfig>) => void;
}

function buildWarnings(config: GraphqlQueryNodeConfig): string[] {
  const warnings: string[] = [];
  const endpoint = config.endpoint?.trim() ?? "";
  const query = config.query?.trim() ?? "";
  const method = config.method ?? "POST";
  const operationType = config.operationType ?? "query";
  const auth = config.auth ?? { type: "none" as const };

  if (!endpoint) {
    warnings.push("Endpoint is required");
  }

  if (!query) {
    warnings.push("Query is required");
  }

  if (method === "GET" && operationType !== "query") {
    warnings.push("GET only supports query operations");
  }

  if (config.variables?.trim()) {
    try {
      const parsed = JSON.parse(config.variables);
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        warnings.push("Variables must be a JSON object");
      }
    } catch {
      warnings.push("Variables must be valid JSON");
    }
  }

  switch (auth.type) {
    case "basic":
      if (!auth.username?.trim()) {
        warnings.push("Basic auth username is required");
      }
      break;
    case "bearer":
      if (!auth.token?.trim()) {
        warnings.push("Bearer token is required");
      }
      break;
    case "api_key":
      if (!(auth.apiKeyName?.trim() && auth.apiKeyValue?.trim())) {
        warnings.push("API key name and value are required");
      }
      break;
    case "oauth2":
      if (!auth.token?.trim()) {
        if (!auth.oauth2TokenUrl?.trim()) {
          warnings.push("OAuth2 token URL is required");
        }
        if (!auth.oauth2ClientId?.trim()) {
          warnings.push("OAuth2 client ID is required");
        }
      }
      break;
    case "custom_header":
      if (!auth.customHeaderName?.trim()) {
        warnings.push("Custom header name is required");
      }
      break;
    default:
      break;
  }

  return warnings;
}

function buildNotes(config: GraphqlQueryNodeConfig): string[] {
  const notes: string[] = [];
  const method = config.method ?? "POST";
  const operationType = config.operationType ?? "query";

  if (method === "GET") {
    notes.push("GET sends query and variables via URL");
  }

  if (config.operationName?.trim()) {
    notes.push("Operation name set");
  }

  if (config.responsePath?.trim()) {
    notes.push("Response path enabled");
  }

  if (config.includeExtensions) {
    notes.push("Extensions included in output");
  }

  if (config.followRedirects === false) {
    notes.push("Redirects disabled");
  }

  if (config.continueOnError) {
    notes.push("Continue on error enabled");
  }

  if (operationType === "subscription") {
    notes.push("Subscriptions are executed as HTTP requests");
  }

  return notes;
}

export const GraphqlQueryConfigPanel = memo(
  forwardRef<HTMLDivElement, GraphqlQueryConfigPanelProps>(
    function GraphqlQueryConfigPanelComponent({ config, onChange }, ref) {
      const method = config.method ?? "POST";
      const operationType = config.operationType ?? "query";
      const headers = config.headers ?? [];
      const auth = config.auth ?? { type: "none" as const };

      const handleEndpointChange = useCallback(
        (endpoint: string) => onChange({ endpoint }),
        [onChange]
      );

      const handleMethodChange = useCallback(
        (m: GraphqlMethod) => {
          const updates: Partial<GraphqlQueryNodeConfig> = { method: m };
          if (m === "GET") {
            updates.operationType = "query";
          }
          onChange(updates);
        },
        [onChange]
      );

      const handleOperationTypeChange = useCallback(
        (t: GraphqlOperationType) => onChange({ operationType: t }),
        [onChange]
      );

      const handleQueryChange = useCallback(
        (query: string) => onChange({ query }),
        [onChange]
      );

      const handleVariablesChange = useCallback(
        (variables: string) => onChange({ variables }),
        [onChange]
      );

      const handleAuthChange = useCallback(
        (a: HttpAuthConfig) => onChange({ auth: a }),
        [onChange]
      );

      const handleHeadersChange = useCallback(
        (h: KeyValuePair[]) => onChange({ headers: h }),
        [onChange]
      );

      const handleExecutionChange = useCallback(
        (patch: Partial<GraphqlQueryNodeConfig>) => onChange(patch),
        [onChange]
      );

      const authBadge = useMemo(
        () => (auth.type !== "none" ? auth.type : undefined),
        [auth.type]
      );

      const headerBadge = useMemo(() => {
        const enabled = headers.filter((h) => h.enabled && h.key);
        return enabled.length > 0 ? `${enabled.length}` : undefined;
      }, [headers]);

      const variablesBadge = useMemo(() => {
        const v = config.variables;
        if (!v?.trim()) {
          return;
        }
        try {
          const parsed = JSON.parse(v);
          return Object.keys(parsed).length > 0 ? "JSON" : undefined;
        } catch {
          return v.trim().length > 0 ? "JSON" : undefined;
        }
      }, [config.variables]);
      const warnings = useMemo(() => buildWarnings(config), [config]);
      const notes = useMemo(() => buildNotes(config), [config]);

      return (
        <div
          className="min-w-0 divide-y divide-border/50 overflow-hidden"
          ref={ref}
        >
          <ConfigSection
            defaultOpen
            icon={<Icons.Globe className="size-4" />}
            title="Request"
          >
            <div className="space-y-4">
              <ConfigField label="Endpoint">
                <EndpointBar
                  endpoint={config.endpoint ?? ""}
                  method={method}
                  onEndpointChange={handleEndpointChange}
                  onMethodChange={handleMethodChange}
                />
              </ConfigField>

              <ConfigField label="Operation Type">
                <OperationTypeSelector
                  methodIsGet={method === "GET"}
                  onChange={handleOperationTypeChange}
                  value={operationType}
                />
              </ConfigField>

              <ConfigField
                label="Operation Name"
                tooltip="Named operation for multi-operation documents"
              >
                <Input
                  className="h-8 font-mono text-xs"
                  onChange={(e) =>
                    onChange({ operationName: e.target.value || undefined })
                  }
                  placeholder="GetUsers"
                  value={config.operationName ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Braces className="size-4" />}
            title="Query"
          >
            <QueryEditor
              onChange={handleQueryChange}
              query={config.query ?? ""}
            />
          </ConfigSection>

          <ConfigSection
            badge={variablesBadge}
            defaultOpen={false}
            icon={<Icons.Braces className="size-4" />}
            title="Variables"
          >
            <VariablesEditor
              onChange={handleVariablesChange}
              variables={config.variables ?? ""}
            />
          </ConfigSection>

          <ConfigSection
            badge={authBadge}
            defaultOpen={false}
            icon={<Icons.LockIcon className="size-4" />}
            title="Authentication"
          >
            <AuthSection auth={auth} onChange={handleAuthChange} />
          </ConfigSection>

          <ConfigSection
            badge={headerBadge}
            defaultOpen={false}
            icon={<Icons.FileText className="size-4" />}
            title="Headers"
          >
            <HeaderEditor headers={headers} onChange={handleHeadersChange} />
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings2 className="size-4" />}
            title="Execution"
          >
            <ExecutionSettings
              config={{
                timeoutMs: config.timeoutMs ?? 30_000,
                includeExtensions: config.includeExtensions ?? false,
                followRedirects: config.followRedirects ?? true,
                responsePath: config.responsePath,
                continueOnError: config.continueOnError ?? false,
              }}
              onChange={handleExecutionChange}
            />
          </ConfigSection>

          <WarningsList items={warnings} />
          <NotesList items={notes} />
        </div>
      );
    }
  )
);

GraphqlQueryConfigPanel.displayName = "GraphqlQueryConfigPanel";
