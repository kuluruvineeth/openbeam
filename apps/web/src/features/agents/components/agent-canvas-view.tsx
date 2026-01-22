"use client";

import {
  AgentCanvas,
  AgentInput,
  AgentMessageList,
  AgentPanel,
  AgentToolbar,
  type AttachedFile,
  type MessageData,
} from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { Skeleton } from "@openplane/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openplane/ui/components/tabs";
import { TooltipProvider } from "@openplane/ui/components/tooltip";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { ArrowLeft, Play, Settings, Square } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useTRPC } from "@/trpc/client";

interface AgentCanvasViewProps {
  agentId: string;
}

function createTextEvent(content: string) {
  return {
    type: "text" as const,
    timestamp: Date.now(),
    content,
    isPartial: false,
  };
}

function AgentCanvasViewSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-border/50 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
        </div>
      </header>
      <div className="flex-1 p-4">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

function AgentCanvasViewContent({ agentId }: AgentCanvasViewProps) {
  const trpc = useTRPC();
  const { data: agent } = useSuspenseQuery(
    trpc.agentCanvas.get.queryOptions({ canvasId: agentId })
  );

  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");

  const nodes = (agent.nodes as Node[]) || [];
  const edges = (agent.edges as Edge[]) || [];

  const handleSend = useCallback((value: string, _files?: AttachedFile[]) => {
    const userMessage: MessageData = {
      id: Date.now().toString(),
      role: "user",
      events: [createTextEvent(value)],
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsRunning(true);

    setTimeout(() => {
      const assistantMessage: MessageData = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        events: [createTextEvent(`Processing your request: "${value}"`)],
        status: "complete",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsRunning(false);
    }, 1000);
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-border/50 border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="ghost">
              <Link href="/agents">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="font-medium">{agent.name}</h1>
              <p className="text-muted-foreground text-xs">
                {agent.description || "No description"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button onClick={handleStop} size="sm" variant="destructive">
                <Square className="mr-2 h-3 w-3" />
                Stop
              </Button>
            ) : (
              <Button
                disabled={agent.status !== "PUBLISHED"}
                size="sm"
                variant="default"
              >
                <Play className="mr-2 h-3 w-3" />
                Run
              </Button>
            )}
            <Button asChild size="icon" variant="outline">
              <Link href={`/agents/${agentId}/edit`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <Tabs
          className="flex flex-1 flex-col overflow-hidden"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <div className="border-border/50 border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="canvas">Workflow</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="m-0 flex-1 overflow-hidden" value="chat">
            <div className="flex h-full">
              <AgentPanel className="flex-1">
                <div className="flex h-full flex-col">
                  <AgentToolbar className="border-border/50 border-b px-4 py-2" />
                  <div className="flex-1 overflow-auto">
                    <AgentMessageList
                      isStreaming={isRunning}
                      messages={messages}
                    />
                  </div>
                  <div className="border-border/50 border-t p-4">
                    <AgentInput
                      isLoading={isRunning}
                      onSubmit={handleSend}
                      placeholder="Ask the agent something..."
                    />
                  </div>
                </div>
              </AgentPanel>
            </div>
          </TabsContent>

          <TabsContent
            className="m-0 flex-1 overflow-hidden p-0"
            value="canvas"
          >
            <AgentCanvas
              className="h-full w-full"
              initialEdges={edges}
              initialNodes={nodes}
              readOnly
              showBackground
              showControls
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export function AgentCanvasView({ agentId }: AgentCanvasViewProps) {
  return (
    <Suspense fallback={<AgentCanvasViewSkeleton />}>
      <AgentCanvasViewContent agentId={agentId} />
    </Suspense>
  );
}
