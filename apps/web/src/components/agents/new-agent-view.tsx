"use client";

import { Button } from "@openplane/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@openplane/ui/components/card";
import { Input } from "@openplane/ui/components/input";
import { Label } from "@openplane/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openplane/ui/components/select";
import { Textarea } from "@openplane/ui/components/textarea";
import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewAgentView() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    model: "claude-sonnet",
    systemPrompt: "",
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setIsCreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsCreating(false);
    router.push("/agents/1");
  };

  const isValid = formData.name.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-border/50 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link href="/agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-medium">New Agent</h1>
              <p className="text-muted-foreground text-xs">
                Configure your new AI agent
              </p>
            </div>
          </div>
        </div>
        <Button disabled={!isValid || isCreating} onClick={handleCreate}>
          {isCreating ? "Creating..." : "Create Agent"}
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
              <CardDescription>
                Give your agent a name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Research Assistant"
                  value={formData.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this agent does..."
                  rows={3}
                  value={formData.description}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Model Configuration</CardTitle>
              <CardDescription>
                Choose the AI model and configure its behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, model: value }))
                  }
                  value={formData.model}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet">Claude Sonnet</SelectItem>
                    <SelectItem value="claude-opus">Claude Opus</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  className="font-mono text-sm"
                  id="systemPrompt"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  placeholder="You are a helpful assistant..."
                  rows={6}
                  value={formData.systemPrompt}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
