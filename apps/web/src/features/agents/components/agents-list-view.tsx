"use client";

import { Button } from "@openplane/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@openplane/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openplane/ui/components/dropdown-menu";
import { Bot, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const mockAgents = [
  {
    id: "1",
    name: "Research Assistant",
    description: "Helps with research tasks and document analysis",
    status: "active",
    lastRun: "2 hours ago",
  },
  {
    id: "2",
    name: "Code Review Agent",
    description: "Reviews code and suggests improvements",
    status: "active",
    lastRun: "1 day ago",
  },
  {
    id: "3",
    name: "Data Analyzer",
    description: "Processes and analyzes data from connected sources",
    status: "draft",
    lastRun: "Never",
  },
];

export function AgentsListView() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl tracking-tight">Agents</h1>
        <Button asChild>
          <Link href="/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockAgents.map((agent) => (
          <Card className="border-border/50" key={agent.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-sm">
                      {agent.name}
                    </CardTitle>
                    <span
                      className={`text-xs ${
                        agent.status === "active"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-8 w-8" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/agents/${agent.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3 line-clamp-2 text-sm">
                {agent.description}
              </CardDescription>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Last run: {agent.lastRun}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/agents/${agent.id}`}>Open</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
