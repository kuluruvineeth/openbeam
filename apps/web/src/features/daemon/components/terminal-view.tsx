"use client";

import { Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { cva } from "class-variance-authority";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDaemonConnectionStatus } from "../hooks/use-daemon-connection";
import type { DaemonClient } from "../lib/daemon-client";
import { useSessionStore } from "../stores/session-store";

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences use control chars
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]/g;

interface TerminalTab {
  id: string;
  name: string;
}

interface TerminalLine {
  id: number;
  text: string;
  timestamp: number;
}

interface TerminalViewProps {
  serverId: string;
  agentId: string;
  cwd: string;
}

const terminalTabVariants = cva(
  "relative flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-medium text-xs transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

function TerminalTabButton({
  tab,
  active,
  onSelect,
  onClose,
  isClosing,
}: {
  tab: TerminalTab;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
  isClosing: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={terminalTabVariants({ active })}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      type="button"
    >
      <span className="max-w-[180px] truncate">{tab.name}</span>
      {(hovered || active) && (
        <button
          className="ml-1 rounded-sm p-0.5 hover:bg-foreground/10"
          disabled={isClosing}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          type="button"
        >
          {isClosing ? (
            <Icons.Loader2 className="size-3 animate-spin" />
          ) : (
            <Icons.Close className="size-3" />
          )}
        </button>
      )}
    </button>
  );
}

function TerminalOutput({
  lines,
  containerRef,
}: {
  lines: TerminalLine[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="flex-1 overflow-auto bg-[hsl(var(--background))] p-3 font-mono text-xs leading-relaxed"
      ref={containerRef}
    >
      {lines.length === 0 ? (
        <span className="text-muted-foreground">No output yet</span>
      ) : (
        lines.map((line) => (
          <div className="whitespace-pre-wrap break-all" key={line.id}>
            <TerminalLineContent text={line.text} />
          </div>
        ))
      )}
    </div>
  );
}

function TerminalLineContent({ text }: { text: string }) {
  const stripped = text.replace(ANSI_ESCAPE_PATTERN, "");
  return <span className="text-foreground">{stripped}</span>;
}

function TerminalInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (input: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        onSubmit(value);
        setValue("");
      }
    },
    [onSubmit, value]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 border-border/30 border-t bg-background px-3 py-2">
      <span className="font-medium text-muted-foreground text-xs">$</span>
      <input
        className="flex-1 bg-transparent font-mono text-foreground text-xs outline-none placeholder:text-muted-foreground/50"
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Terminal disconnected" : "Enter command..."}
        ref={inputRef}
        type="text"
        value={value}
      />
    </div>
  );
}

export function TerminalView({ serverId }: TerminalViewProps) {
  const _client = useSessionStore(
    (state) => state.sessions[serverId]?.client ?? null
  ) as DaemonClient | null;
  const connectionRecord = useDaemonConnectionStatus(serverId);
  const isConnected = connectionRecord?.status === "online";

  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: "default", name: "Terminal 1" },
  ]);
  const [activeTabId, setActiveTabId] = useState("default");
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);
  const [error, _setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const lineCounterRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    const container = outputRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleCreateTab = useCallback(() => {
    setIsCreating(true);
    const id = `term-${Date.now()}`;
    const name = `Terminal ${tabs.length + 1}`;
    setTabs((prev) => [...prev, { id, name }]);
    setActiveTabId(id);
    setLines([]);
    setIsCreating(false);
  }, [tabs.length]);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      setClosingTabId(tabId);
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (next.length === 0) {
          const fallback = { id: `term-${Date.now()}`, name: "Terminal 1" };
          setActiveTabId(fallback.id);
          setLines([]);
          return [fallback];
        }
        if (activeTabId === tabId) {
          setActiveTabId(next[0].id);
          setLines([]);
        }
        return next;
      });
      setClosingTabId(null);
    },
    [activeTabId]
  );

  const handleInput = useCallback((input: string) => {
    const id = lineCounterRef.current;
    lineCounterRef.current += 1;
    setLines((prev) => [
      ...prev,
      { id, text: `$ ${input}`, timestamp: Date.now() },
    ]);
  }, []);

  if (!isConnected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <Icons.AlertCircle className="size-5 text-muted-foreground/40" />
        <span>Host is not connected</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-border/30 border-b px-2 py-1">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <TerminalTabButton
              active={tab.id === activeTabId}
              isClosing={closingTabId === tab.id}
              key={tab.id}
              onClose={() => handleCloseTab(tab.id)}
              onSelect={() => {
                setActiveTabId(tab.id);
                setLines([]);
              }}
              tab={tab}
            />
          ))}
        </div>
        <Button
          className="size-7 shrink-0"
          disabled={isCreating}
          onClick={handleCreateTab}
          size="icon"
          variant="ghost"
        >
          {isCreating ? (
            <Icons.Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Icons.Plus className="size-3.5" />
          )}
        </Button>
      </div>

      <TerminalOutput containerRef={outputRef} lines={lines} />
      <TerminalInput disabled={!isConnected} onSubmit={handleInput} />

      {error && (
        <div className="border-border/30 border-t bg-muted px-3 py-1">
          <span className="text-destructive text-xs">{error}</span>
        </div>
      )}
    </div>
  );
}
