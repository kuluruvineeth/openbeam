"use client";

import { Button } from "@openplane/ui";
import { Icons } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  isAgenticMode: boolean;
};

export function MCPConnectorsDropdown({ isAgenticMode }: Props) {
  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                "gap-1 px-3 py-1 text-sm",
                isAgenticMode
                  ? "cursor-pointer bg-muted text-foreground hover:bg-accent"
                  : "cursor-not-allowed bg-muted text-muted-foreground opacity-60"
              )}
              disabled={!isAgenticMode}
              variant="ghost"
            >
              <Icons.GavelIcon className="text-muted-foreground" size={14} />
              <span>Mcp</span>
              <Icons.ChevronDownIcon
                className="ml-1 text-muted-foreground"
                size={16}
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isAgenticMode
              ? "MCP Connectors"
              : "Enable Agent mode to use MCP connectors"}
          </p>
        </TooltipContent>
        <DropdownMenuContent
          align="start"
          className="relative w-72 border border-border bg-popover"
          side="top"
        >
          <DropdownMenuLabel className="p-2 text-foreground">
            Select a Connector
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-center text-muted-foreground"
            disabled
          >
            No connectors available
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  );
}
