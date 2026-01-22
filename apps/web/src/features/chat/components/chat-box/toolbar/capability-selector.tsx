"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@openplane/ui";
import { Icons } from "@/components/icons";
import type { Capability } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type Props = {
  selectedCapability: Capability;
  onCapabilityChange: (capability: Capability) => void;
};

export function CapabilitySelector({
  selectedCapability,
  onCapabilityChange,
}: Props) {
  return (
    <Tabs
      className="ml-2"
      onValueChange={(value) => {
        const newCapability = value === "none" ? null : (value as Capability);
        if (selectedCapability === newCapability) {
          onCapabilityChange(null);
        } else {
          onCapabilityChange(newCapability);
        }
      }}
      value={selectedCapability || "none"}
    >
      <TabsList className="h-auto bg-muted p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <TabsTrigger
              className={cn(
                "h-8 w-12 p-0 transition-colors",
                "data-[state=active]:bg-background data-[state=active]:text-foreground",
                "hover:text-foreground data-[state=inactive]:text-muted-foreground"
              )}
              value="reasoning"
            >
              <Icons.AtomIcon size={20} />
            </TabsTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reasoning</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <TabsTrigger
              className={cn(
                "h-8 w-12 p-0 transition-colors",
                "data-[state=active]:bg-background data-[state=active]:text-foreground",
                "hover:text-foreground data-[state=inactive]:text-muted-foreground"
              )}
              value="websearch"
            >
              <Icons.GlobeIcon size={20} />
            </TabsTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Web Search</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <TabsTrigger
              className={cn(
                "h-8 w-12 p-0 transition-colors",
                "data-[state=active]:bg-background data-[state=active]:text-foreground",
                "hover:text-foreground data-[state=inactive]:text-muted-foreground"
              )}
              value="deepResearch"
            >
              <Icons.BrainIcon size={20} />
            </TabsTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Deep Thinking</p>
          </TooltipContent>
        </Tooltip>
      </TabsList>
    </Tabs>
  );
}
