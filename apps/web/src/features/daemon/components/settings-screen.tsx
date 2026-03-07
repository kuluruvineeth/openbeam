"use client";

import { cn, Icons } from "@openbeam/ui";
import { Button } from "@openbeam/ui/components/button";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { HEADER_INNER_HEIGHT } from "../constants";
import {
  type ConnectionListEntry,
  useDaemonConnections,
} from "../hooks/use-daemon-connection";
import { useSettings } from "../hooks/use-settings";
import { ConnectionStatusIndicator } from "./connection-status-indicator";

type ThemeOption = "light" | "dark" | "auto";

function HostCard({ connection }: { connection: ConnectionListEntry }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground text-sm">
          {connection.label ?? connection.serverId}
        </span>
        <ConnectionStatusIndicator connected={connection.status === "online"} />
      </div>
      {connection.version && (
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          v{connection.version}
        </span>
      )}
    </div>
  );
}

function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemeOption;
  onChange: (theme: ThemeOption) => void;
}) {
  const options: { value: ThemeOption; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "auto", label: "System" },
  ];

  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          className={cn(
            "rounded-sm px-3 py-1 font-medium text-xs transition-colors",
            value === option.value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const { connections } = useDaemonConnections();
  const { settings, updateSettings } = useSettings();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const currentTheme = (settings?.theme as ThemeOption) ?? "auto";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-2 border-border/30 border-b px-3"
        style={{ height: HEADER_INNER_HEIGHT }}
      >
        <Button
          className="size-7"
          onClick={handleBack}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-semibold text-foreground text-sm">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-6">
          <section>
            <h2 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Hosts
            </h2>
            <div className="space-y-2">
              {connections.map((c) => (
                <HostCard connection={c} key={c.serverId} />
              ))}
              {connections.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No hosts configured.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Appearance
            </h2>
            <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2.5">
              <span className="text-foreground text-sm">Theme</span>
              <ThemeSelector
                onChange={(theme) => updateSettings({ theme })}
                value={currentTheme}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              About
            </h2>
            <div className="rounded-md border border-border/40 px-3 py-2.5 text-muted-foreground text-sm">
              OpenBeam Daemon
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
