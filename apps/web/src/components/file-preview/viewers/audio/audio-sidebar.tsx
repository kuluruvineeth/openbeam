"use client";

import {
  Button,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@openplane/ui";
import { Icons } from "@/components/icons";
import type { AudioTab } from "@/lib/audio-types";
import { cn } from "@/lib/utils";

type AudioSidebarProps = {
  activeTab: AudioTab;
  onTabChange: (tab: AudioTab) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: {
    transcript: React.ReactNode;
    summary: React.ReactNode;
    ask: React.ReactNode;
  };
};

const TABS: { value: AudioTab; icon: React.ReactNode; label: string }[] = [
  { value: "transcript", icon: <Icons.Text size={14} />, label: "Transcript" },
  { value: "summary", icon: <Icons.BookOpen size={14} />, label: "Summary" },
  { value: "ask", icon: <Icons.Message size={14} />, label: "Ask" },
];

export function AudioSidebarToggle({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "absolute top-3 right-3 z-30 size-8 transition-all duration-300",
            isOpen
              ? "bg-foreground/10 text-foreground hover:bg-foreground/20"
              : "border border-border/50 bg-background/80 text-foreground/60 shadow-sm backdrop-blur-sm hover:bg-background hover:text-foreground"
          )}
          onClick={onToggle}
          size="icon"
          variant="ghost"
        >
          <Icons.SidebarRight size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {isOpen ? "Close panel" : "Open panel"}
      </TooltipContent>
    </Tooltip>
  );
}

export function AudioSidebarPanel({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  children,
}: AudioSidebarProps & { onClose: () => void }) {
  return (
    <div
      className={cn(
        "h-full shrink-0 border-border/50 border-l bg-background transition-all duration-300 ease-out",
        isOpen ? "w-80 opacity-100" : "w-0 overflow-hidden opacity-0"
      )}
    >
      <div className="flex h-full w-80 flex-col">
        <div className="flex h-9 shrink-0 items-center justify-between border-border/50 border-b px-3">
          <span className="font-medium text-[10px] text-foreground/50 uppercase tracking-wider">
            Panel
          </span>
          <Button
            className="size-6 text-foreground/40 hover:text-foreground"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <Icons.Close size={14} />
          </Button>
        </div>

        <Tabs
          className="flex h-[calc(100%-2.25rem)] flex-col"
          onValueChange={(v) => onTabChange(v as AudioTab)}
          value={activeTab}
        >
          <div className="shrink-0 border-border/50 border-b">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-9 w-full justify-start gap-0 bg-transparent p-0">
                {TABS.map((tab) => (
                  <TabsTrigger
                    className="h-9 shrink-0 gap-1.5 px-3 text-[11px] text-foreground/40 hover:text-foreground/60 data-[state=active]:bg-primary/15 data-[state=active]:font-medium data-[state=active]:text-primary"
                    key={tab.value}
                    value={tab.value}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar className="h-1" orientation="horizontal" />
            </ScrollArea>
          </div>

          <TabsContent
            className="mt-0 h-full flex-1 overflow-hidden data-[state=inactive]:hidden"
            value="transcript"
          >
            {children.transcript}
          </TabsContent>

          <TabsContent
            className="mt-0 h-full flex-1 overflow-hidden data-[state=inactive]:hidden"
            value="summary"
          >
            <ScrollArea className="[&>div>div]:block! h-full">
              {children.summary}
            </ScrollArea>
          </TabsContent>

          <TabsContent
            className="mt-0 h-full flex-1 overflow-hidden data-[state=inactive]:hidden"
            value="ask"
          >
            {children.ask}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
