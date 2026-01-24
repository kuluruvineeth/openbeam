"use client";

import {
  getEventResourceRequirements,
  getResourceLabel,
  getResourcePlaceholder,
} from "@openplane/types/services/connectors/common/resources";
import type {
  ConnectorType,
  EventCategory,
} from "@openplane/types/services/connectors/events";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  type ComponentType,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "../utils/cn";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  CONNECTOR_ICONS,
  EVENT_CATEGORY_ICONS,
  getAllConnectorsWithEvents,
  getConnectorEventsUI,
  getEventsByConnectorGrouped,
} from "./canvas/event-types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Skeleton } from "./skeleton";

export interface EventConfig {
  connectorId?: string;
  connectorType: ConnectorType;
  eventId: string;
  resourceId?: string;
  resourceType?: string;
  resourceName?: string;
}

export interface ConnectorInfo {
  id: string;
  type: ConnectorType;
  name: string;
}

export interface ResourceInfo {
  id: string;
  name: string;
  resourceType: string;
}

export interface LogoProps {
  size?: number;
  className?: string;
}

interface EventBuilderProps {
  value?: EventConfig;
  onChange: (config: EventConfig) => void;
  connectors?: ConnectorInfo[];
  logos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
  className?: string;
}

const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  slack: "Slack",
  linear: "Linear",
  notion: "Notion",
  gmail: "Gmail",
  "google-drive": "Google Drive",
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  messages: "Messages",
  channels: "Channels",
  reactions: "Reactions",
  files: "Files",
  users: "Users",
  issues: "Issues",
  projects: "Projects",
  documents: "Documents",
  comments: "Comments",
  pages: "Pages",
  databases: "Databases",
  emails: "Emails",
  calendar: "Calendar",
  storage: "Storage",
  other: "Other",
};

function getConnectorLabel(type: ConnectorType): string {
  return CONNECTOR_LABELS[type] ?? type;
}

const ComboboxSkeleton = memo(function ComboboxSkeletonInner() {
  return (
    <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="size-4" />
    </div>
  );
});
ComboboxSkeleton.displayName = "ComboboxSkeleton";

function getCategoryLabel(category: EventCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

interface ConnectorComboboxProps {
  value: ConnectorType | undefined;
  onChange: (type: ConnectorType, connectorId?: string) => void;
  connectors?: ConnectorInfo[];
  logos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
}

const ConnectorCombobox = memo(function ConnectorComboboxInner({
  value,
  onChange,
  connectors: availableConnectors,
  logos,
}: ConnectorComboboxProps) {
  const [open, setOpen] = useState(false);
  const allConnectorTypes = useMemo(() => getAllConnectorsWithEvents(), []);
  const connectorTypeMap = useMemo(
    () => new Map(availableConnectors?.map((c) => [c.type, c])),
    [availableConnectors]
  );

  const selectedConnectorType = allConnectorTypes.find((c) => c.type === value);
  const CustomLogo = value ? logos?.[value] : undefined;
  const FallbackIcon = value ? CONNECTOR_ICONS[value] : undefined;
  const SelectedIcon = CustomLogo ?? FallbackIcon;

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedConnectorType ? (
            <div className="flex items-center gap-2">
              {SelectedIcon && (
                <SelectedIcon
                  className={cn(
                    "size-4 shrink-0",
                    !CustomLogo && "text-muted-foreground"
                  )}
                  size={16}
                />
              )}
              <span>{getConnectorLabel(selectedConnectorType.type)}</span>
              {connectorTypeMap.has(selectedConnectorType.type) && (
                <Badge
                  className="ml-1 px-1.5 py-0 text-[10px]"
                  variant="outline"
                >
                  Connected
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select integration...</span>
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search integrations..." />
          <CommandList className="no-scrollbar">
            <CommandEmpty>No integration found.</CommandEmpty>
            <CommandGroup>
              {allConnectorTypes.map((connectorType) => {
                const CustomConnectorLogo = logos?.[connectorType.type];
                const DefaultIcon = CONNECTOR_ICONS[connectorType.type];
                const connectorInfo = connectorTypeMap.get(connectorType.type);
                const isConnected = !!connectorInfo;

                return (
                  <CommandItem
                    key={connectorType.type}
                    onSelect={() => {
                      onChange(connectorType.type, connectorInfo?.id);
                      setOpen(false);
                    }}
                    value={connectorType.type}
                  >
                    <div className="flex w-full items-center gap-2">
                      {CustomConnectorLogo ? (
                        <CustomConnectorLogo
                          className="size-4 shrink-0"
                          size={16}
                        />
                      ) : (
                        <DefaultIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span>{getConnectorLabel(connectorType.type)}</span>
                      {isConnected && (
                        <Badge
                          className="ml-auto px-1.5 py-0 text-[10px]"
                          variant="outline"
                        >
                          Connected
                        </Badge>
                      )}
                      <span className="ml-auto text-muted-foreground text-xs">
                        {connectorType.eventCount} events
                      </span>
                      {value === connectorType.type && (
                        <Check className="ml-1 size-4 shrink-0" />
                      )}
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
ConnectorCombobox.displayName = "ConnectorCombobox";

interface ResourceComboboxProps {
  connectorId: string;
  resourceType: string;
  value: string | undefined;
  onChange: (resourceId: string, resourceName: string) => void;
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
}

const ResourceCombobox = memo(function ResourceComboboxInner({
  connectorId,
  resourceType,
  value,
  onChange,
  onFetchResources,
}: ResourceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!(connectorId && resourceType && onFetchResources)) {
      setResources([]);
      setInitialLoad(false);
      return;
    }

    setLoading(true);
    setError(null);

    onFetchResources(connectorId, resourceType)
      .then((data) => {
        setResources(data);
        setLoading(false);
        setInitialLoad(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load resources");
        setLoading(false);
        setInitialLoad(false);
      });
  }, [connectorId, resourceType, onFetchResources]);

  const selectedResource = resources.find((r) => r.id === value);
  const placeholder = getResourcePlaceholder(resourceType);

  if (initialLoad && loading) {
    return <ComboboxSkeleton />;
  }

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
          disabled={loading || !onFetchResources}
          role="combobox"
          variant="outline"
        >
          {(() => {
            if (loading) {
              return (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              );
            }
            if (selectedResource) {
              return <span>{selectedResource.name}</span>;
            }
            return <span className="text-muted-foreground">{placeholder}</span>;
          })()}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${getResourceLabel(resourceType).toLowerCase()}s...`}
          />
          <CommandList className="no-scrollbar max-h-[200px]">
            {(() => {
              if (error) {
                return (
                  <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                    {error}
                  </div>
                );
              }
              if (resources.length === 0) {
                return (
                  <CommandEmpty>
                    No {getResourceLabel(resourceType).toLowerCase()}s found.
                  </CommandEmpty>
                );
              }
              return (
                <CommandGroup>
                  {resources.map((resource) => (
                    <CommandItem
                      key={resource.id}
                      onSelect={() => {
                        onChange(resource.id, resource.name);
                        setOpen(false);
                      }}
                      value={`${resource.id}-${resource.name}`}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span>{resource.name}</span>
                        {value === resource.id && (
                          <Check className="ml-auto size-4 shrink-0" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
ResourceCombobox.displayName = "ResourceCombobox";

interface EventComboboxProps {
  connectorType: ConnectorType;
  value: string | undefined;
  onChange: (eventId: string) => void;
}

const EventCombobox = memo(function EventComboboxInner({
  connectorType,
  value,
  onChange,
}: EventComboboxProps) {
  const [open, setOpen] = useState(false);

  const groupedEvents = useMemo(
    () => getEventsByConnectorGrouped(connectorType),
    [connectorType]
  );

  const selectedEvent = useMemo(() => {
    if (!value) {
      return;
    }
    const events = getConnectorEventsUI(connectorType);
    return events.find((e) => e.id === value);
  }, [connectorType, value]);

  const SelectedIcon = selectedEvent
    ? EVENT_CATEGORY_ICONS[selectedEvent.category]
    : null;

  return (
    <Popover modal onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
          role="combobox"
          variant="outline"
        >
          {selectedEvent ? (
            <div className="flex items-center gap-2">
              {SelectedIcon && (
                <SelectedIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span>{selectedEvent.name}</span>
              {selectedEvent.isRealtime && (
                <Badge
                  className="ml-1 px-1.5 py-0 text-[10px]"
                  variant="secondary"
                >
                  Live
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select event...</span>
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[350px] p-0">
        <Command>
          <CommandInput placeholder="Search events..." />
          <CommandList className="no-scrollbar max-h-[300px]">
            <CommandEmpty>No event found.</CommandEmpty>
            {groupedEvents.map((group) => {
              const CategoryIcon = group.icon;
              return (
                <CommandGroup
                  heading={
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon className="size-3.5" />
                      <span>{getCategoryLabel(group.category)}</span>
                    </div>
                  }
                  key={group.category}
                >
                  {group.events.map((event) => (
                    <CommandItem
                      key={event.id}
                      onSelect={() => {
                        onChange(event.id);
                        setOpen(false);
                      }}
                      value={`${group.category}-${event.id}-${event.name}`}
                    >
                      <div className="flex w-full flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.name}</span>
                          {event.isRealtime && (
                            <Badge
                              className="px-1.5 py-0 text-[10px]"
                              variant="secondary"
                            >
                              Live
                            </Badge>
                          )}
                          {value === event.id && (
                            <Check className="ml-auto size-4 shrink-0" />
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {event.description}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
EventCombobox.displayName = "EventCombobox";

export const EventBuilder = memo(
  forwardRef<HTMLDivElement, EventBuilderProps>(function EventBuilderComponent(
    { value, onChange, connectors, logos, onFetchResources, className },
    ref
  ) {
    const [selectedConnectorType, setSelectedConnectorType] = useState<
      ConnectorType | undefined
    >(value?.connectorType);

    const [selectedConnectorId, setSelectedConnectorId] = useState<
      string | undefined
    >(value?.connectorId);

    const [selectedEvent, setSelectedEvent] = useState<string | undefined>(
      value?.eventId
    );

    const [selectedResourceType, setSelectedResourceType] = useState<
      string | undefined
    >(value?.resourceType);

    const [selectedResourceId, setSelectedResourceId] = useState<
      string | undefined
    >(value?.resourceId);

    const [selectedResourceName, setSelectedResourceName] = useState<
      string | undefined
    >(value?.resourceName);

    const connectorTypeMap = useMemo(
      () => new Map(connectors?.map((c) => [c.type, c])),
      [connectors]
    );

    const resourceRequirements = useMemo(() => {
      if (!selectedEvent) {
        return null;
      }
      return getEventResourceRequirements(selectedEvent);
    }, [selectedEvent]);

    const availableResourceTypes = resourceRequirements?.resourceTypes ?? [];
    const requiresResource = resourceRequirements?.requiresResource ?? false;
    const showResourceSelector =
      availableResourceTypes.length > 0 && selectedConnectorId;

    const handleConnectorChange = useCallback(
      (type: ConnectorType, connectorId?: string) => {
        setSelectedConnectorType(type);
        setSelectedConnectorId(connectorId);
        setSelectedEvent(undefined);
        setSelectedResourceType(undefined);
        setSelectedResourceId(undefined);
        setSelectedResourceName(undefined);
      },
      []
    );

    const handleEventChange = useCallback(
      (eventId: string) => {
        setSelectedEvent(eventId);
        setSelectedResourceType(undefined);
        setSelectedResourceId(undefined);
        setSelectedResourceName(undefined);

        if (selectedConnectorType) {
          const eventReqs = getEventResourceRequirements(eventId);
          if (!eventReqs || eventReqs.resourceTypes.length === 0) {
            onChange({
              connectorId: selectedConnectorId,
              connectorType: selectedConnectorType,
              eventId,
            });
          } else if (eventReqs.resourceTypes.length === 1) {
            setSelectedResourceType(eventReqs.resourceTypes[0]);
          }
        }
      },
      [selectedConnectorType, selectedConnectorId, onChange]
    );

    const handleResourceTypeChange = useCallback((type: string) => {
      setSelectedResourceType(type);
      setSelectedResourceId(undefined);
      setSelectedResourceName(undefined);
    }, []);

    const handleResourceChange = useCallback(
      (resourceId: string, resourceName: string) => {
        setSelectedResourceId(resourceId);
        setSelectedResourceName(resourceName);

        if (selectedConnectorType && selectedEvent && selectedResourceType) {
          onChange({
            connectorId: selectedConnectorId,
            connectorType: selectedConnectorType,
            eventId: selectedEvent,
            resourceId,
            resourceType: selectedResourceType,
            resourceName,
          });
        }
      },
      [
        selectedConnectorType,
        selectedConnectorId,
        selectedEvent,
        selectedResourceType,
        onChange,
      ]
    );

    const summary = useMemo(() => {
      if (!(selectedConnectorType && selectedEvent)) {
        return "Select an integration and event to trigger this workflow";
      }
      const events = getConnectorEventsUI(selectedConnectorType);
      const event = events.find((e) => e.id === selectedEvent);
      if (!event) {
        return "Select an event";
      }

      const connectorLabel = getConnectorLabel(selectedConnectorType);
      const isConnected = connectorTypeMap.has(selectedConnectorType);

      let resourceText = "";
      if (selectedResourceName && selectedResourceType) {
        resourceText = ` in ${getResourceLabel(selectedResourceType).toLowerCase()} "${selectedResourceName}"`;
      } else if (requiresResource && !selectedResourceId) {
        resourceText = " (select a resource)";
      }

      return (
        <>
          Trigger when{" "}
          <span className="font-medium">{event.name.toLowerCase()}</span>
          {resourceText} in{" "}
          <span className="font-medium">{connectorLabel}</span>
          {!isConnected && connectors && (
            <span className="text-amber-500"> (not connected)</span>
          )}
        </>
      );
    }, [
      selectedConnectorType,
      selectedEvent,
      connectorTypeMap,
      connectors,
      selectedResourceName,
      selectedResourceType,
      selectedResourceId,
      requiresResource,
    ]);

    return (
      <div className={cn("min-w-0 space-y-4", className)} ref={ref}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-muted-foreground text-xs">
              Integration
            </span>
            <ConnectorCombobox
              connectors={connectors}
              logos={logos}
              onChange={handleConnectorChange}
              value={selectedConnectorType}
            />
          </div>

          {selectedConnectorType && (
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-muted-foreground text-xs">
                Event
              </span>
              <EventCombobox
                connectorType={selectedConnectorType}
                onChange={handleEventChange}
                value={selectedEvent}
              />
            </div>
          )}

          {showResourceSelector && availableResourceTypes.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs">Scope</span>
              <div className="flex flex-wrap gap-2">
                {availableResourceTypes.map((type) => (
                  <Button
                    className="h-8 px-3"
                    key={type}
                    onClick={() => handleResourceTypeChange(type)}
                    size="sm"
                    variant={
                      selectedResourceType === type ? "secondary" : "outline"
                    }
                  >
                    {getResourceLabel(type)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {showResourceSelector &&
            selectedResourceType &&
            selectedConnectorId && (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs">
                  {getResourceLabel(selectedResourceType)}
                </span>
                <ResourceCombobox
                  connectorId={selectedConnectorId}
                  onChange={handleResourceChange}
                  onFetchResources={onFetchResources}
                  resourceType={selectedResourceType}
                  value={selectedResourceId}
                />
              </div>
            )}
        </div>

        <div className="rounded-sm border border-border/50 bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground text-xs">{summary}</p>
        </div>
      </div>
    );
  })
);

EventBuilder.displayName = "EventBuilder";
