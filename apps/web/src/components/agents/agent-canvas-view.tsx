"use client";

import {
  AgentCanvas,
  AgentInput,
  AgentMessageList,
  AgentPanel,
  AgentToolbar,
  type AttachedFile,
  createEndNodeData,
  createLlmNodeData,
  createStartNodeData,
  type MessageData,
} from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openplane/ui/components/tabs";
import { TooltipProvider } from "@openplane/ui/components/tooltip";
import type { Edge, Node } from "@xyflow/react";
import { ArrowLeft, Play, Settings, Square } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

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

const mockMessages: MessageData[] = [
  {
    id: "1",
    role: "user",
    events: [createTextEvent("Help me analyze the Q4 sales data")],
    createdAt: Date.now() - 60_000,
  },
  {
    id: "2",
    role: "assistant",
    events: [
      createTextEvent(
        "I'll help you analyze the Q4 sales data. Let me search through your connected data sources to find the relevant information."
      ),
    ],
    status: "complete",
    createdAt: Date.now() - 55_000,
  },
];

const DEMO_NODES: Node[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 250, y: 50 },
    data: createStartNodeData(),
  },
  {
    id: "llm-1",
    type: "llm",
    position: { x: 250, y: 200 },
    data: createLlmNodeData(),
  },
  {
    id: "end-1",
    type: "end",
    position: { x: 250, y: 350 },
    data: createEndNodeData(),
  },
];

const DEMO_EDGES: Edge[] = [
  {
    id: "edge-start-llm",
    source: "start-1",
    target: "llm-1",
    type: "control",
  },
  {
    id: "edge-llm-end",
    source: "llm-1",
    target: "end-1",
    type: "data",
  },
];

export function AgentCanvasView({ agentId }: AgentCanvasViewProps) {
  const [messages, setMessages] = useState<MessageData[]>(mockMessages);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");

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
              <h1 className="font-medium">Agent {agentId}</h1>
              <p className="text-muted-foreground text-xs">
                Research Assistant
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
              <Button disabled size="sm" variant="default">
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
              initialEdges={DEMO_EDGES}
              initialNodes={DEMO_NODES}
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
