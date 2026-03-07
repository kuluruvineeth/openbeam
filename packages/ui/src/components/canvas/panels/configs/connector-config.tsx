"use client";

import type {
  ConnectorActionDefinition,
  ConnectorActionInput,
  ConnectorActionStakes,
  ConnectorActionsRegistry,
  ConnectorNodeConfig,
} from "@openbeam/types/canvas";
import {
  CONNECTOR_TYPES,
  type ConnectorType,
} from "@openbeam/types/services/connectors/events";
import type { ComponentType } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../../../utils";
import {
  formatDuration,
  normalizeConnectorType,
} from "../../../../utils/format";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Badge } from "../../../badge";
import { Button } from "../../../button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../../command";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Popover, PopoverContent, PopoverTrigger } from "../../../popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { Skeleton } from "../../../skeleton";
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
import type {
  ConnectorInfo,
  LogoProps,
  ResourceInfo,
} from "../../event-builder/event-builder";
import { CONNECTOR_ICONS } from "../../event-types";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  slack: "Slack",
  linear: "Linear",
  notion: "Notion",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  github: "GitHub",
};

const RESOURCE_LABELS: Record<string, string> = {
  message: "Messages",
  channel: "Channels",
  user: "Users",
  file: "Files",
  dm: "Direct Messages",
  bookmark: "Bookmarks",
  permission: "Permissions",
  folder: "Folders",
  page: "Pages",
  database: "Databases",
  block: "Blocks",
  email: "Email",
  thread: "Threads",
  label: "Labels",
  issue: "Issues",
  project: "Projects",
  team: "Teams",
  comment: "Comments",
};

function findRegistryForType(
  registries: ConnectorActionsRegistry[],
  connectorType: string
): ConnectorActionsRegistry | undefined {
  const normalized = normalizeConnectorType(connectorType);
  return registries.find(
    (r) => r.connectorType === connectorType || r.connectorType === normalized
  );
}

function groupActionsByResource(
  actions: ConnectorActionDefinition[]
): Map<string, ConnectorActionDefinition[]> {
  const groups = new Map<string, ConnectorActionDefinition[]>();
  for (const action of actions) {
    const existing = groups.get(action.resource);
    if (existing) {
      existing.push(action);
    } else {
      groups.set(action.resource, [action]);
    }
  }
  return groups;
}

function getIconForConnector(
  connectorType: ConnectorType,
  logos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>
): { Icon: ComponentType<LogoProps>; isBrandLogo: boolean } {
  const brandLogo = logos?.[connectorType];
  if (brandLogo) {
    return { Icon: brandLogo, isBrandLogo: true };
  }
  return {
    Icon: CONNECTOR_ICONS[connectorType] ?? Icons.Plug,
    isBrandLogo: false,
  };
}

interface ConnectorConfigPanelProps {
  config: ConnectorNodeConfig;
  onChange: (updates: Partial<ConnectorNodeConfig>) => void;
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
  connectors?: ConnectorInfo[];
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
  actionRegistries?: ConnectorActionsRegistry[];
}

const EMPTY_REGISTRIES: ConnectorActionsRegistry[] = [];

export const ConnectorConfigPanel = memo(
  function ConnectorConfigPanelComponent({
    config,
    onChange,
    connectorLogos,
    connectors,
    onFetchResources,
    actionRegistries = EMPTY_REGISTRIES,
  }: ConnectorConfigPanelProps) {
    const matchingAccounts = useMemo(
      () => (connectors ?? []).filter((c) => c.type === config.connectorType),
      [connectors, config.connectorType]
    );

    const registry = useMemo(
      () =>
        config.connectorType
          ? findRegistryForType(actionRegistries, config.connectorType)
          : undefined,
      [actionRegistries, config.connectorType]
    );

    const actions = useMemo(() => registry?.actions ?? [], [registry]);

    const selectedAction = useMemo(
      () => actions.find((a) => a.id === config.operation),
      [actions, config.operation]
    );

    const requiredInputs = useMemo(
      () => selectedAction?.inputs.filter((i) => i.required) ?? [],
      [selectedAction]
    );

    const optionalInputs = useMemo(
      () => selectedAction?.inputs.filter((i) => !i.required) ?? [],
      [selectedAction]
    );

    const handleConnectorTypeChange = useCallback(
      (connectorType: string) => {
        const matching = (connectors ?? []).filter(
          (c) => c.type === connectorType
        );
        const autoSelectedId =
          matching.length === 1 ? matching[0]?.id : undefined;
        onChange({
          connectorType,
          connectorId: autoSelectedId,
          operation: "",
          params: {},
        });
      },
      [onChange, connectors]
    );

    const handleAccountChange = useCallback(
      (connectorId: string) => {
        onChange({ connectorId });
      },
      [onChange]
    );

    const handleOperationChange = useCallback(
      (operation: string) => {
        onChange({ operation, params: {} });
      },
      [onChange]
    );

    const handleFieldChange = useCallback(
      (fieldId: string, value: unknown) => {
        onChange({ params: { ...config.params, [fieldId]: value } });
      },
      [config.params, onChange]
    );

    const actionInputIds = useMemo(
      () => new Set(selectedAction?.inputs.map((i) => i.id) ?? []),
      [selectedAction]
    );

    const customParams = useMemo(() => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(config.params ?? {})) {
        if (!actionInputIds.has(key)) {
          result[key] = value;
        }
      }
      return result;
    }, [config.params, actionInputIds]);

    const handleCustomParamsChange = useCallback(
      (customUpdates: Record<string, unknown>) => {
        const fieldParams: Record<string, unknown> = {};
        for (const key of actionInputIds) {
          if (config.params?.[key] !== undefined) {
            fieldParams[key] = config.params[key];
          }
        }
        onChange({ params: { ...fieldParams, ...customUpdates } });
      },
      [config.params, actionInputIds, onChange]
    );

    const warnings = useMemo(() => {
      const list: string[] = [];
      const connectorType = config.connectorType?.trim() ?? "";

      if (!connectorType) {
        list.push("Select a connector");
      }

      if (connectorType && !config.connectorId?.trim()) {
        list.push("Select an account");
      }

      if (connectorType && connectors && matchingAccounts.length === 0) {
        list.push(
          `Connect a ${CONNECTOR_LABELS[connectorType as ConnectorType] ?? connectorType} account`
        );
      }

      if (
        connectorType &&
        actionRegistries.length > 0 &&
        actions.length === 0
      ) {
        list.push("No actions available for this connector");
      }

      if (connectorType && !config.operation?.trim()) {
        list.push("Select an action");
      }

      if (selectedAction) {
        const missingRequired = requiredInputs.filter((input) => {
          const value = config.params?.[input.id];
          if (value === undefined || value === null) {
            return true;
          }
          if (typeof value === "string" && value.trim().length === 0) {
            return true;
          }
          return false;
        });
        if (missingRequired.length > 0) {
          list.push(
            `Missing required fields: ${missingRequired
              .map((input) => input.name)
              .join(", ")}`
          );
        }
      }

      return list;
    }, [
      actionRegistries.length,
      actions.length,
      config.connectorId,
      config.connectorType,
      config.operation,
      config.params,
      connectors,
      matchingAccounts.length,
      requiredInputs,
      selectedAction,
    ]);

    const notes = useMemo(() => {
      const list: string[] = [];
      const customParamCount = Object.keys(customParams).length;

      if (selectedAction?.stakes === "high") {
        list.push("Destructive action");
      }

      if (selectedAction?.reversible) {
        list.push("Action is reversible");
      }

      if (selectedAction?.batchSupport) {
        list.push("Supports batch execution");
      }

      if (selectedAction?.rateLimit) {
        list.push(
          `Rate limit: ${selectedAction.rateLimit.requests} / ${formatDuration(
            selectedAction.rateLimit.windowMs
          )}`
        );
      }

      if (selectedAction?.requiredScopes?.length) {
        list.push(
          `Requires scopes: ${selectedAction.requiredScopes.join(", ")}`
        );
      }

      if (customParamCount > 0) {
        list.push("Custom params are ignored unless action defines them");
      }

      return list;
    }, [customParams, selectedAction]);

    return (
      <div>
        <ConfigSection
          defaultOpen
          icon={<Icons.Plug className="size-4" />}
          title="Connector"
        >
          <div className="space-y-4">
            <ConfigField label="Type" required>
              <ConnectorTypeSelector
                logos={connectorLogos}
                onChange={handleConnectorTypeChange}
                value={config.connectorType}
              />
            </ConfigField>

            <AnimatedSizeContainer height>
              {config.connectorType && matchingAccounts.length > 1 && (
                <ConfigField label="Account" required>
                  <ConnectedAccountSelector
                    accounts={matchingAccounts}
                    connectorType={config.connectorType as ConnectorType}
                    logos={connectorLogos}
                    onChange={handleAccountChange}
                    value={config.connectorId}
                  />
                </ConfigField>
              )}
            </AnimatedSizeContainer>

            <AnimatedSizeContainer height>
              {config.connectorType &&
                matchingAccounts.length === 0 &&
                connectors &&
                connectors.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    No{" "}
                    {CONNECTOR_LABELS[config.connectorType as ConnectorType] ??
                      config.connectorType}{" "}
                    accounts connected.
                  </p>
                )}
            </AnimatedSizeContainer>

            <AnimatedSizeContainer height>
              {config.connectorType && (
                <ConfigField label="Action" required>
                  <ActionSelector
                    actions={actions}
                    onChange={handleOperationChange}
                    value={config.operation}
                  />
                </ConfigField>
              )}
            </AnimatedSizeContainer>

            {selectedAction && (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-muted-foreground text-xs">
                  {selectedAction.description}
                </p>
                <StakesBadge stakes={selectedAction.stakes} />
              </div>
            )}
          </div>
        </ConfigSection>

        {selectedAction && requiredInputs.length > 0 && (
          <ConfigSection
            defaultOpen
            icon={<Icons.Settings2 className="size-4" />}
            title="Required Fields"
          >
            <div className="space-y-4">
              {requiredInputs.map((input) => (
                <ActionFieldInput
                  connectorId={config.connectorId}
                  input={input}
                  key={input.id}
                  onChange={handleFieldChange}
                  onFetchResources={onFetchResources}
                  params={config.params}
                  value={config.params?.[input.id]}
                />
              ))}
            </div>
          </ConfigSection>
        )}

        {selectedAction && optionalInputs.length > 0 && (
          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings2 className="size-4" />}
            title={`Optional Fields (${optionalInputs.length})`}
          >
            <div className="space-y-4">
              {optionalInputs.map((input) => (
                <ActionFieldInput
                  connectorId={config.connectorId}
                  input={input}
                  key={input.id}
                  onChange={handleFieldChange}
                  onFetchResources={onFetchResources}
                  params={config.params}
                  value={config.params?.[input.id]}
                />
              ))}
            </div>
          </ConfigSection>
        )}

        <ConfigSection
          defaultOpen={false}
          icon={<Icons.Settings2 className="size-4" />}
          title="Parameters"
        >
          <ParamsEditor
            onChange={handleCustomParamsChange}
            params={customParams}
          />
        </ConfigSection>

        {warnings.length > 0 && (
          <div className="space-y-2 px-5 pb-4">
            {warnings.map((warning) => (
              <div
                className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-warning text-xs"
                key={warning}
              >
                <Icons.AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div className="space-y-2 px-5 pb-4">
            {notes.map((note) => (
              <div
                className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-muted-foreground text-xs"
                key={note}
              >
                <Icons.Info className="mt-0.5 size-3.5 shrink-0" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ConnectorConfigPanel.displayName = "ConnectorConfigPanel";

interface StakesBadgeProps {
  stakes: ConnectorActionStakes;
}

const StakesBadge = memo(function StakesBadgeComponent({
  stakes,
}: StakesBadgeProps) {
  if (stakes !== "high") {
    return null;
  }

  return (
    <Badge
      className="shrink-0 border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
      variant="outline"
    >
      Destructive
    </Badge>
  );
});

StakesBadge.displayName = "StakesBadge";

interface ConnectorTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  logos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
}

const ConnectorTypeSelector = memo(function ConnectorTypeSelectorComponent({
  value,
  onChange,
  logos,
}: ConnectorTypeSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = value
    ? (CONNECTOR_LABELS[value as ConnectorType] ?? value)
    : undefined;

  const { Icon: SelectedIcon, isBrandLogo: selectedIsBrand } = useMemo(
    () =>
      value
        ? getIconForConnector(value as ConnectorType, logos)
        : { Icon: Icons.Plug, isBrandLogo: false },
    [value, logos]
  );

  const handleSelect = useCallback(
    (connectorType: string) => {
      onChange(connectorType);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-controls="connector-type-list"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedLabel ? (
            <div className="flex items-center gap-2 truncate">
              <SelectedIcon
                className={cn(
                  "size-4 shrink-0",
                  !selectedIsBrand && "text-muted-foreground"
                )}
              />
              <span className="truncate">{selectedLabel}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select connector...</span>
          )}
          <Icons.ChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search connectors..." />
          <CommandList
            className="no-scrollbar max-h-[260px]"
            id="connector-type-list"
          >
            <CommandEmpty>No connectors found.</CommandEmpty>
            <CommandGroup>
              {CONNECTOR_TYPES.map((ct) => {
                const { Icon: ConnectorIcon, isBrandLogo } =
                  getIconForConnector(ct, logos);
                const isSelected = ct === value;

                return (
                  <CommandItem
                    key={ct}
                    onSelect={() => handleSelect(ct)}
                    value={`${ct} ${CONNECTOR_LABELS[ct]}`}
                  >
                    <div className="flex w-full items-center gap-2">
                      <Icons.Check
                        className={cn(
                          "size-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <ConnectorIcon
                        className={cn(
                          "size-4 shrink-0",
                          !isBrandLogo && "text-muted-foreground"
                        )}
                      />
                      <span>{CONNECTOR_LABELS[ct]}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

ConnectorTypeSelector.displayName = "ConnectorTypeSelector";

interface ConnectedAccountSelectorProps {
  accounts: ConnectorInfo[];
  connectorType: ConnectorType;
  value?: string;
  onChange: (connectorId: string) => void;
  logos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
}

const ConnectedAccountSelector = memo(
  function ConnectedAccountSelectorComponent({
    accounts,
    connectorType,
    value,
    onChange,
    logos,
  }: ConnectedAccountSelectorProps) {
    const { Icon, isBrandLogo } = useMemo(
      () => getIconForConnector(connectorType, logos),
      [connectorType, logos]
    );

    return (
      <Select onValueChange={onChange} value={value ?? ""}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select account..." />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    !isBrandLogo && "text-muted-foreground"
                  )}
                />
                <span>{account.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

ConnectedAccountSelector.displayName = "ConnectedAccountSelector";

interface ActionSelectorProps {
  actions: ConnectorActionDefinition[];
  value: string;
  onChange: (value: string) => void;
}

const ActionSelector = memo(function ActionSelectorComponent({
  actions,
  value,
  onChange,
}: ActionSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedAction = useMemo(
    () => actions.find((a) => a.id === value),
    [actions, value]
  );

  const resourceGroups = useMemo(
    () => groupActionsByResource(actions),
    [actions]
  );

  const handleSelect = useCallback(
    (actionId: string) => {
      onChange(actionId);
      setOpen(false);
    },
    [onChange]
  );

  if (actions.length === 0) {
    return (
      <Input
        className="h-9"
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. send_message, create_issue"
        value={value}
      />
    );
  }

  const groupEntries = Array.from(resourceGroups.entries());

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-controls="connector-action-list"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedAction ? (
            <span className="truncate">{selectedAction.name}</span>
          ) : (
            <span className="text-muted-foreground">Select action...</span>
          )}
          <Icons.ChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search actions..." />
          <CommandList
            className="no-scrollbar max-h-[320px]"
            id="connector-action-list"
          >
            <CommandEmpty>No actions found.</CommandEmpty>
            {groupEntries.map(([resource, groupActions], index) => (
              <div key={resource}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={RESOURCE_LABELS[resource] ?? resource}>
                  {groupActions.map((action) => {
                    const isSelected = action.id === value;
                    return (
                      <CommandItem
                        key={action.id}
                        onSelect={() => handleSelect(action.id)}
                        value={`${action.id} ${action.name} ${action.description} ${resource}`}
                      >
                        <div className="flex w-full items-center gap-2">
                          <Icons.Check
                            className={cn(
                              "size-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-sm">
                                {action.name}
                              </span>
                              {action.stakes === "high" && (
                                <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
                              )}
                            </div>
                            <span className="truncate text-muted-foreground text-xs">
                              {action.description}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

ActionSelector.displayName = "ActionSelector";

function renderInputByType(
  input: ConnectorActionInput,
  value: unknown,
  isDisabled: boolean,
  onChange: (newValue: unknown) => void
) {
  switch (input.type) {
    case "boolean":
      return (
        <Switch
          checked={Boolean(value)}
          disabled={isDisabled}
          onCheckedChange={onChange}
        />
      );
    case "number":
      return (
        <Input
          className="h-9"
          disabled={isDisabled}
          max={input.validation?.max}
          min={input.validation?.min}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={input.description}
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
          disabled={isDisabled}
          maxLength={input.validation?.maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.description}
          value={(value as string) ?? ""}
        />
      );
    case "email":
      return (
        <Input
          className="h-9"
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.description ?? "email@example.com"}
          type="email"
          value={(value as string) ?? ""}
        />
      );
    case "url":
      return (
        <Input
          className="h-9"
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.description ?? "https://"}
          type="url"
          value={(value as string) ?? ""}
        />
      );
    case "date":
      return (
        <Input
          className="h-9"
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          type="date"
          value={(value as string) ?? ""}
        />
      );
    default:
      return (
        <Input
          className="h-9"
          disabled={isDisabled}
          maxLength={input.validation?.maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.description}
          value={(value as string) ?? ""}
        />
      );
  }
}

interface ActionFieldInputProps {
  input: ConnectorActionInput;
  value: unknown;
  onChange: (fieldId: string, value: unknown) => void;
  connectorId?: string;
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
  params?: Record<string, unknown>;
}

const ActionFieldInput = memo(function ActionFieldInputComponent({
  input,
  value,
  onChange,
  connectorId,
  onFetchResources,
  params,
}: ActionFieldInputProps) {
  const isDisabled = useMemo(() => {
    if (!input.dependsOn) {
      return false;
    }
    const dependencyValue = params?.[input.dependsOn];
    return dependencyValue === undefined || dependencyValue === "";
  }, [input.dependsOn, params]);

  const handleChange = useCallback(
    (newValue: unknown) => {
      onChange(input.id, newValue);
    },
    [input.id, onChange]
  );

  const renderField = () => {
    if (input.dynamic && input.type === "string") {
      return (
        <ResourceFieldSelector
          connectorId={connectorId}
          onChange={handleChange}
          onFetchResources={onFetchResources}
          resourceType={input.resourceType ?? input.id}
          value={(value as string) ?? ""}
        />
      );
    }

    if (input.options && input.options.length > 0) {
      return (
        <OptionsSelect
          onChange={handleChange}
          options={input.options}
          placeholder={input.description}
          value={value}
        />
      );
    }

    return renderInputByType(input, value, isDisabled, handleChange);
  };

  return (
    <ConfigField
      description={
        input.dependsOn ? `Depends on ${input.dependsOn}` : undefined
      }
      label={input.name}
      required={input.required}
    >
      {renderField()}
    </ConfigField>
  );
});

ActionFieldInput.displayName = "ActionFieldInput";

interface OptionsSelectProps {
  options: Array<{ label: string; value: unknown }>;
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}

const OptionsSelect = memo(function OptionsSelectComponent({
  options,
  value,
  onChange,
  placeholder,
}: OptionsSelectProps) {
  return (
    <Select
      onValueChange={(v) => onChange(v)}
      value={value !== undefined && value !== null ? String(value) : ""}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

OptionsSelect.displayName = "OptionsSelect";

interface ResourceFieldSelectorProps {
  connectorId?: string;
  resourceType: string;
  value: string;
  onChange: (value: unknown) => void;
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
}

const ResourceFieldSelector = memo(function ResourceFieldSelectorComponent({
  connectorId,
  resourceType,
  value,
  onChange,
  onFetchResources,
}: ResourceFieldSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!(connectorId && onFetchResources)) {
      setResources([]);
      return;
    }

    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    setLoading(true);

    onFetchResources(connectorId, resourceType).then(
      (result) => {
        if (fetchIdRef.current === currentFetchId) {
          setResources(result);
          setLoading(false);
        }
      },
      () => {
        if (fetchIdRef.current === currentFetchId) {
          setResources([]);
          setLoading(false);
        }
      }
    );
  }, [connectorId, resourceType, onFetchResources]);

  const selectedResource = useMemo(
    () => resources.find((r) => r.id === value),
    [resources, value]
  );

  const handleSelect = useCallback(
    (resourceId: string) => {
      onChange(resourceId);
      setOpen(false);
    },
    [onChange]
  );

  const disabled = !(connectorId && onFetchResources);

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-controls="resource-field-list"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          {selectedResource ? (
            <span className="truncate">{selectedResource.name}</span>
          ) : (
            <span className="text-muted-foreground">
              {disabled
                ? "Select an account first"
                : `Select ${resourceType}...`}
            </span>
          )}
          <Icons.ChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${resourceType}s...`} />
          <CommandList
            className="no-scrollbar max-h-[260px]"
            id="resource-field-list"
          >
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : (
              <>
                <CommandEmpty>No {resourceType}s found.</CommandEmpty>
                <CommandGroup>
                  {resources.map((resource) => {
                    const isSelected = resource.id === value;
                    return (
                      <CommandItem
                        key={resource.id}
                        onSelect={() => handleSelect(resource.id)}
                        value={`${resource.id} ${resource.name}`}
                      >
                        <div className="flex w-full items-center gap-2">
                          <Icons.Check
                            className={cn(
                              "size-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{resource.name}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

ResourceFieldSelector.displayName = "ResourceFieldSelector";

interface ParamsEditorProps {
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}

const ParamsEditor = memo(function ParamsEditorComponent({
  params,
  onChange,
}: ParamsEditorProps) {
  const entries = useMemo(() => Object.entries(params), [params]);

  const handleAdd = useCallback(() => {
    let counter = 1;
    while (`param_${counter}` in params) {
      counter += 1;
    }
    onChange({ ...params, [`param_${counter}`]: "" });
  }, [params, onChange]);

  const handleRemove = useCallback(
    (key: string) => {
      const next = { ...params };
      delete next[key];
      onChange(next);
    },
    [params, onChange]
  );

  const handleKeyChange = useCallback(
    (oldKey: string, newKey: string) => {
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) {
        next[k === oldKey ? newKey : k] = v;
      }
      onChange(next);
    },
    [params, onChange]
  );

  const handleValueChange = useCallback(
    (key: string, value: string) => {
      onChange({ ...params, [key]: value });
    },
    [params, onChange]
  );

  return (
    <div className="space-y-2">
      {entries.map(([key, value], index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Param keys are mutable data being edited — cannot serve as React keys
        <div className="flex items-center gap-1.5" key={index}>
          <Input
            className="h-8 flex-1 text-xs"
            onChange={(e) => handleKeyChange(key, e.target.value)}
            placeholder="Key"
            value={key}
          />
          <Input
            className="h-8 flex-1 text-xs"
            onChange={(e) => handleValueChange(key, e.target.value)}
            placeholder="Value"
            value={String(value ?? "")}
          />
          <Button
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => handleRemove(key)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Icons.Close className="size-3.5" />
          </Button>
        </div>
      ))}
      <button
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border/50 border-dashed py-1.5 text-muted-foreground text-xs transition-colors hover:border-border hover:text-foreground"
        onClick={handleAdd}
        type="button"
      >
        <Icons.Plus className="size-3.5" />
        Add Parameter
      </button>
    </div>
  );
});

ParamsEditor.displayName = "ParamsEditor";
