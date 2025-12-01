"use client";

import { appStore } from "@openplane/integrations";
import { useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useConnectors } from "@/hooks/use-connectors";
import { cn } from "@/lib/utils";

type AppFilterProps = {
  selected: string[];
  onChange: (value: string[] | null) => void;
};

export function AppFilter({ selected, onChange }: AppFilterProps) {
  const [open, setOpen] = useState(false);
  const { data: connectors } = useConnectors();

  const connectorTypes = useMemo(() => {
    if (!connectors) {
      return [];
    }

    const types = new Map<
      string,
      { label: string; app: (typeof appStore)[number] | undefined }
    >();
    for (const connector of connectors) {
      const type = connector.app.toLowerCase();
      if (!types.has(type)) {
        const app = appStore.find((a) => a.id.toLowerCase() === type);
        types.set(type, { label: app?.name || type, app });
      }
    }

    return Array.from(types.entries()).map(([type, config]) => ({
      value: type,
      ...config,
    }));
  }, [connectors]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      const newSelection = selected.filter((s) => s !== option);
      onChange(newSelection.length > 0 ? newSelection : null);
    } else {
      onChange([...selected, option]);
    }
  };

  const selectedApps = connectorTypes.filter((t) => selected.includes(t.value));

  const renderButtonContent = () => {
    if (selectedApps.length === 1 && selectedApps[0].app) {
      return (
        <>
          <AppLogo app={selectedApps[0].app} size={14} />
          {selectedApps[0].label}
        </>
      );
    }

    if (selectedApps.length > 1) {
      return (
        <>
          <div className="-space-x-1 flex">
            {selectedApps
              .slice(0, 3)
              .map((t) =>
                t.app ? <AppLogo app={t.app} key={t.value} size={14} /> : null
              )}
          </div>
          <span>{selected.length} apps</span>
        </>
      );
    }

    return (
      <>
        <Icons.Integrations className="text-foreground/50" size={14} />
        Apps
      </>
    );
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "h-8 gap-2 border-border/50 px-3 text-xs",
            selected.length > 0 && "bg-foreground/5"
          )}
          size="sm"
          variant="outline"
        >
          {renderButtonContent()}
          <Icons.ChevronDown className="text-foreground/40" size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Search apps..." />
          <CommandList>
            <CommandEmpty>No apps found.</CommandEmpty>
            <CommandGroup>
              {connectorTypes.map((type) => (
                <CommandItem
                  key={type.value}
                  onSelect={() => toggleOption(type.value)}
                >
                  <div
                    className={cn(
                      "mr-2 flex size-4 items-center justify-center border border-border/50",
                      selected.includes(type.value) &&
                        "bg-foreground text-background"
                    )}
                  >
                    {selected.includes(type.value) && (
                      <Icons.CheckIcon size={10} />
                    )}
                  </div>
                  {type.app ? (
                    <AppLogo app={type.app} size={14} />
                  ) : (
                    <Icons.Integrations
                      className="text-foreground/50"
                      size={14}
                    />
                  )}
                  <span className="flex-1">{type.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <div className="border-border/40 border-t p-1">
              <Button
                className="h-7 w-full text-xs"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                size="sm"
                variant="ghost"
              >
                Clear selection
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
