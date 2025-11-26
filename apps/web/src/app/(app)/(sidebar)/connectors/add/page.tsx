"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CONNECTOR_TYPES = [
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Index files and folders from Google Drive",
    icon: "📁",
    category: "Storage",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Index messages and files from Slack channels",
    icon: "💬",
    category: "Communication",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Index pages and databases from Notion",
    icon: "📝",
    category: "Documentation",
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Index spaces and pages from Confluence",
    icon: "📚",
    category: "Documentation",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Index repositories, issues, and PRs",
    icon: "🐙",
    category: "Development",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Index projects, issues, and comments",
    icon: "🎯",
    category: "Project Management",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Index files and folders from Dropbox",
    icon: "📦",
    category: "Storage",
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    description: "Index documents from SharePoint",
    icon: "📂",
    category: "Storage",
  },
];

const CATEGORIES = ["All", ...new Set(CONNECTOR_TYPES.map((c) => c.category))];

export default function AddConnectorPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedConnector, setSelectedConnector] = useState<string | null>(
    null
  );
  const [isConnecting, setIsConnecting] = useState(false);

  const filteredConnectors = CONNECTOR_TYPES.filter((connector) => {
    const matchesSearch =
      !search ||
      connector.name.toLowerCase().includes(search.toLowerCase()) ||
      connector.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "All" || connector.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = async () => {
    if (!selectedConnector) return;
    setIsConnecting(true);

    // TODO: Implement OAuth flow via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1500));

    router.push("/connectors");
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          onClick={() => router.push("/connectors")}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Add Connector</h1>
          <p className="text-muted-foreground text-sm">
            Connect a new data source to start indexing
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Icons.Search
            className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground"
            size={18}
          />
          <Input
            className="h-10 pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connectors..."
            value={search}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            className={cn(
              "shrink-0 px-4 py-2 text-sm transition-colors",
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            key={cat}
            onClick={() => setCategory(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Connectors Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        {filteredConnectors.map((connector) => (
          <button
            className={cn(
              "flex items-start gap-4 border p-4 text-left transition-colors",
              selectedConnector === connector.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            key={connector.id}
            onClick={() => setSelectedConnector(connector.id)}
            type="button"
          >
            <span className="text-3xl">{connector.icon}</span>
            <div>
              <h3 className="mb-1 font-medium text-foreground">
                {connector.name}
              </h3>
              <p className="text-muted-foreground text-sm">
                {connector.description}
              </p>
              <span className="mt-2 inline-block bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                {connector.category}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Connect Button */}
      <div className="flex justify-end gap-3">
        <Button onClick={() => router.back()} variant="outline">
          Cancel
        </Button>
        <Button
          disabled={!selectedConnector || isConnecting}
          onClick={handleConnect}
        >
          {isConnecting ? (
            <>
              <Icons.Spinner className="mr-2 animate-spin" size={16} />
              Connecting...
            </>
          ) : (
            <>
              Connect
              <Icons.ArrowRight className="ml-2" size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
