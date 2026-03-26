"use client";

import { Button, Skeleton } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import {
  generateCurlSnippet,
  generateNodeSnippet,
  generatePushUrl,
  generatePythonSnippet,
  generateWebhookUrl,
} from "@/features/connectors/lib/code-snippet-generator";
import { useTRPC } from "@/trpc/client";

type ConnectorApiDocsTabProps = {
  connectorId: string;
};

const SNIPPET_TABS = ["curl", "python", "node"] as const;
type SnippetTab = (typeof SNIPPET_TABS)[number];

const SNIPPET_LABELS: Record<SnippetTab, string> = {
  curl: "cURL",
  python: "Python",
  node: "Node.js",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      className="absolute top-2 right-2"
      onClick={handleCopy}
      size="sm"
      variant="ghost"
    >
      {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
    </Button>
  );
}

function EndpointRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copied");
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <div className="flex items-center justify-between border border-border/50 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-foreground/50 text-xs">{label}</p>
        <code className="block truncate font-mono text-xs">{url}</code>
      </div>
      <Button onClick={handleCopy} size="sm" variant="ghost">
        {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
      </Button>
    </div>
  );
}

export function ConnectorApiDocsTab({ connectorId }: ConnectorApiDocsTabProps) {
  const [activeTab, setActiveTab] = useState<SnippetTab>("curl");
  const trpc = useTRPC();

  const { data: definition, isLoading } = useQuery(
    trpc.customConnectors.getByConnector.queryOptions({
      connectorId,
    })
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="flex h-32 items-center justify-center border border-border/50 border-dashed">
        <p className="text-foreground/40 text-sm">Definition not found</p>
      </div>
    );
  }

  const slug = definition.slug;
  const placeholder = "YOUR_API_KEY";

  const snippets: Record<SnippetTab, string> = {
    curl: generateCurlSnippet(slug, placeholder),
    python: generatePythonSnippet(slug, placeholder),
    node: generateNodeSnippet(slug, placeholder),
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-sm">Endpoints</h3>
        <p className="mt-0.5 text-foreground/50 text-xs">
          Use these URLs to send data to this connector.
        </p>
      </div>

      <div className="space-y-2">
        <EndpointRow label="Push API" url={generatePushUrl(slug)} />
        <EndpointRow label="Webhook" url={generateWebhookUrl(slug)} />
      </div>

      <div>
        <h3 className="font-medium text-sm">Code Examples</h3>
        <p className="mt-0.5 text-foreground/50 text-xs">
          Replace YOUR_API_KEY with a key from the API Keys tab.
        </p>
      </div>

      <div>
        <div className="flex border-border/50 border-b">
          {SNIPPET_TABS.map((tab) => (
            <button
              className={`px-3 py-2 font-medium text-xs transition-colors ${
                activeTab === tab
                  ? "border-foreground border-b-2 text-foreground"
                  : "text-foreground/40 hover:text-foreground/70"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {SNIPPET_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="relative">
          <pre className="overflow-x-auto border border-border/50 border-t-0 bg-background p-4 font-mono text-xs leading-relaxed">
            {snippets[activeTab]}
          </pre>
          <CopyButton text={snippets[activeTab]} />
        </div>
      </div>
    </div>
  );
}
