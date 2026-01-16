"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@openplane/ui";
import { Icons } from "@/components/icons";
import { useChatTab } from "@/hooks/use-chat-tab";
import { cn } from "@/lib/utils";

type Props = {
  askContent: React.ReactNode;
  searchContent: React.ReactNode;
};

export function ChatTabs({ askContent, searchContent }: Props) {
  const { tab, setTab } = useChatTab();

  return (
    <Tabs
      className="w-full"
      onValueChange={(value) => {
        setTab(value as "ask" | "search");
      }}
      value={tab}
    >
      <TabsList
        className={cn(
          "mb-[14px] h-auto bg-transparent p-0",
          "inline-flex items-center justify-start gap-2"
        )}
      >
        <TabsTrigger
          className={cn(
            "flex items-center pr-[12px] transition-colors",
            "data-[state=active]:bg-muted data-[state=active]:text-foreground",
            "data-[state=inactive]:text-muted-foreground"
          )}
          value="ask"
        >
          <Icons.Sparkle className="mt-[6px] mr-[6px] mb-[6px] ml-[12px] h-[14px] w-[14px]" />
          Ask
        </TabsTrigger>

        <TabsTrigger
          className={cn(
            "flex items-center pr-[12px] transition-colors",
            "data-[state=active]:bg-muted data-[state=active]:text-foreground",
            "data-[state=inactive]:text-muted-foreground"
          )}
          value="search"
        >
          <Icons.Search className="mt-[6px] mr-[6px] mb-[6px] ml-[12px] h-[14px] w-[14px]" />
          Search
        </TabsTrigger>
      </TabsList>

      <TabsContent className="mt-0" value="search">
        {searchContent}
      </TabsContent>

      <TabsContent className="mt-0" value="ask">
        {askContent}
      </TabsContent>
    </Tabs>
  );
}
