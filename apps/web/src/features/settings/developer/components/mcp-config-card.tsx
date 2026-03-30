"use client";

import { Button, Input } from "@openbeam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { McpClient } from "../lib/mcp-configs";
import { MCP_SERVER_URL } from "../lib/mcp-configs";
import { MCP_CLIENT_LOGOS } from "./mcp-client-logos";

type McpConfigCardProps = {
  client: McpClient;
  isExpanded: boolean;
  onToggle: () => void;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <Button
      className="h-7 gap-1.5 px-2 text-xs"
      onClick={handleCopy}
      size="sm"
      variant="outline"
    >
      <AnimatePresence initial={false} mode="wait">
        {copied ? (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="copied"
            transition={{ duration: 0.15 }}
          >
            <Icons.Check className="text-emerald-500" size={12} />
            Copied
          </motion.span>
        ) : (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1"
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="copy"
            transition={{ duration: 0.15 }}
          >
            <Icons.Copy size={12} />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

export function McpConfigCard({
  client,
  isExpanded,
  onToggle,
}: McpConfigCardProps) {
  const [apiKey, setApiKey] = useState("");

  const generatedConfig = useMemo(
    () => client.configGenerator(apiKey || "YOUR_API_KEY", MCP_SERVER_URL),
    [client, apiKey]
  );

  return (
    <div
      className={cn(
        "rounded-md border border-border/50 transition-colors",
        isExpanded && "border-border"
      )}
    >
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
        onClick={onToggle}
        type="button"
      >
        <span className="flex items-center gap-3">
          {MCP_CLIENT_LOGOS[client.id]?.({ size: 28 })}
          <span className="font-medium text-sm">{client.name}</span>
        </span>
        <Icons.ChevronDown
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
          size={16}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="space-y-4 border-border/50 border-t px-4 py-4">
              <div className="space-y-1.5">
                <label
                  className="font-medium text-muted-foreground text-xs"
                  htmlFor={`api-key-${client.id}`}
                >
                  API Key
                </label>
                <Input
                  className="h-8 font-mono text-xs"
                  id={`api-key-${client.id}`}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="op_live_..."
                  type="password"
                  value={apiKey}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground text-xs">
                    Configuration
                  </span>
                  <CopyButton value={generatedConfig} />
                </div>
                <pre className="overflow-x-auto whitespace-pre rounded-sm bg-muted p-3 font-mono text-foreground text-xs">
                  {generatedConfig}
                </pre>
              </div>

              <div className="space-y-2">
                <span className="font-medium text-muted-foreground text-xs">
                  Setup
                </span>
                <ol className="space-y-1.5">
                  {client.setupSteps.map((step, index) => (
                    <li
                      className="flex gap-2 text-muted-foreground text-xs"
                      key={step}
                    >
                      <span className="font-medium text-foreground">
                        {index + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center gap-2">
                {client.deepLink && apiKey && (
                  <Button
                    asChild
                    className="h-7 text-xs"
                    size="sm"
                    variant="outline"
                  >
                    <a href={client.deepLink(apiKey, MCP_SERVER_URL)}>
                      <Icons.Download size={12} />
                      One-Click Install
                    </a>
                  </Button>
                )}
                {client.docsUrl && (
                  <Button
                    asChild
                    className="h-7 text-xs"
                    size="sm"
                    variant="ghost"
                  >
                    <a
                      href={client.docsUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Icons.ExternalLink size={12} />
                      Docs
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
