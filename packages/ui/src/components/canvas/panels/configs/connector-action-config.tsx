"use client";

import type {
  ConnectorActionInput,
  ConnectorActionNodeConfig,
} from "@openplane/types/canvas";
import { memo, useCallback, useMemo, useState } from "react";
import { Input } from "../../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

interface ConnectorActionConfigPanelProps {
  config: ConnectorActionNodeConfig;
  onChange: (updates: Partial<ConnectorActionNodeConfig>) => void;
  connectorTypes?: string[];
  getResourcesForConnector?: (connectorType: string) => string[];
  getOperationsForResource?: (
    connectorType: string,
    resource: string
  ) => Array<{
    id: string;
    name: string;
    description: string;
    stakes: string;
    inputs: ConnectorActionInput[];
  }>;
}

export const ConnectorActionConfigPanel = memo(
  function ConnectorActionConfigPanelComponent({
    config,
    onChange,
    connectorTypes = [],
    getResourcesForConnector,
    getOperationsForResource,
  }: ConnectorActionConfigPanelProps) {
    const [selectedResource, setSelectedResource] = useState("");

    const resources = useMemo(() => {
      if (!(config.connectorType && getResourcesForConnector)) {
        return [];
      }
      return getResourcesForConnector(config.connectorType);
    }, [config.connectorType, getResourcesForConnector]);

    const operations = useMemo(() => {
      if (
        !(config.connectorType && selectedResource && getOperationsForResource)
      ) {
        return [];
      }
      return getOperationsForResource(config.connectorType, selectedResource);
    }, [config.connectorType, selectedResource, getOperationsForResource]);

    const selectedAction = useMemo(
      () => operations.find((op) => op.id === config.actionId),
      [operations, config.actionId]
    );

    const handleConnectorChange = useCallback(
      (connectorType: string) => {
        onChange({
          connectorType,
          actionId: "",
          inputMappings: {},
        });
        setSelectedResource("");
      },
      [onChange]
    );

    const handleResourceChange = useCallback(
      (resource: string) => {
        setSelectedResource(resource);
        onChange({ actionId: "", inputMappings: {} });
      },
      [onChange]
    );

    const handleActionChange = useCallback(
      (actionId: string) => {
        onChange({ actionId, inputMappings: {} });
      },
      [onChange]
    );

    const handleInputChange = useCallback(
      (inputId: string, value: unknown) => {
        onChange({
          inputMappings: { ...config.inputMappings, [inputId]: value },
        });
      },
      [config.inputMappings, onChange]
    );

    return (
      <div>
        <ConfigSection defaultOpen title="Action">
          <div className="space-y-4">
            <ConfigField label="Connector" required>
              <Select
                onValueChange={handleConnectorChange}
                value={config.connectorType}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select connector" />
                </SelectTrigger>
                <SelectContent>
                  {connectorTypes.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {ct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>

            {config.connectorType && resources.length > 0 && (
              <ConfigField label="Resource" required>
                <Select
                  onValueChange={handleResourceChange}
                  value={selectedResource}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            )}

            {selectedResource && operations.length > 0 && (
              <ConfigField label="Operation" required>
                <Select
                  onValueChange={handleActionChange}
                  value={config.actionId}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            )}

            {selectedAction && (
              <p className="text-muted-foreground text-xs">
                {selectedAction.description}
              </p>
            )}
          </div>
        </ConfigSection>

        {selectedAction && selectedAction.inputs.length > 0 && (
          <ConfigSection defaultOpen title="Inputs">
            <div className="space-y-4">
              {selectedAction.inputs.map((input) => (
                <ActionInputField
                  input={input}
                  key={input.id}
                  onChange={handleInputChange}
                  value={config.inputMappings[input.id]}
                />
              ))}
            </div>
          </ConfigSection>
        )}

        <ConfigSection title="Error Handling">
          <div className="space-y-4">
            <ConfigField label="Continue on Error">
              <Switch
                checked={config.continueOnError}
                onCheckedChange={(checked) =>
                  onChange({ continueOnError: checked })
                }
              />
            </ConfigField>

            {config.retryConfig && (
              <ConfigField label="Max Retries">
                <Input
                  className="h-9"
                  max={10}
                  min={1}
                  onChange={(e) => {
                    if (!config.retryConfig) {
                      return;
                    }
                    onChange({
                      retryConfig: {
                        ...config.retryConfig,
                        maxAttempts: Number(e.target.value),
                      },
                    });
                  }}
                  type="number"
                  value={config.retryConfig.maxAttempts}
                />
              </ConfigField>
            )}

            {config.timeoutMs !== undefined && (
              <ConfigField label="Timeout (ms)">
                <Input
                  className="h-9"
                  min={100}
                  onChange={(e) =>
                    onChange({ timeoutMs: Number(e.target.value) })
                  }
                  type="number"
                  value={config.timeoutMs}
                />
              </ConfigField>
            )}
          </div>
        </ConfigSection>
      </div>
    );
  }
);

ConnectorActionConfigPanel.displayName = "ConnectorActionConfigPanel";

interface ActionInputFieldProps {
  input: ConnectorActionInput;
  value: unknown;
  onChange: (inputId: string, value: unknown) => void;
}

const ActionInputField = memo(function ActionInputFieldComponent({
  input,
  value,
  onChange,
}: ActionInputFieldProps) {
  const handleChange = useCallback(
    (newValue: unknown) => {
      onChange(input.id, newValue);
    },
    [input.id, onChange]
  );

  const renderField = () => {
    if (input.options && input.options.length > 0) {
      return (
        <Select onValueChange={handleChange} value={(value as string) ?? ""}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder={`Select ${input.name.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {input.options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    switch (input.type) {
      case "boolean":
        return (
          <Switch checked={Boolean(value)} onCheckedChange={handleChange} />
        );
      case "number":
        return (
          <Input
            className="h-9"
            max={input.validation?.max}
            min={input.validation?.min}
            onChange={(e) => handleChange(Number(e.target.value))}
            type="number"
            value={(value as number) ?? ""}
          />
        );
      case "json":
      case "html":
      case "markdown":
        return (
          <Textarea
            className="min-h-[80px] resize-y font-mono text-xs"
            onChange={(e) => handleChange(e.target.value)}
            placeholder={input.description}
            value={(value as string) ?? ""}
          />
        );
      default:
        return (
          <Input
            className="h-9"
            onChange={(e) => handleChange(e.target.value)}
            placeholder={input.description}
            type={
              input.type === "email" || input.type === "url"
                ? input.type
                : "text"
            }
            value={(value as string) ?? ""}
          />
        );
    }
  };

  return (
    <ConfigField
      label={input.name}
      required={input.required}
      tooltip={input.description}
    >
      {renderField()}
    </ConfigField>
  );
});

ActionInputField.displayName = "ActionInputField";
