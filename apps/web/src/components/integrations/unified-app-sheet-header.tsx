"use client";

import type { UnifiedApp } from "@openplane/integrations";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openplane/ui";
import { formatDistanceToNow } from "date-fns";
import { AppLogo } from "@/components/integrations/app-logo";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ActionButtonProps = {
  app: UnifiedApp;
  isLoading: boolean;
  isDisconnecting: boolean;
  isNextDisabled?: boolean;
  handleDisconnect: () => void;
  handleOnInitialize: () => Promise<void>;
};

function InstalledActions({
  isLoading,
  isDisconnecting,
  isNextDisabled,
  handleDisconnect,
  handleOnInitialize,
}: Omit<ActionButtonProps, "app">) {
  return (
    <div className="flex items-center gap-3">
      <Button
        disabled={isLoading || isNextDisabled}
        onClick={handleOnInitialize}
        size="sm"
      >
        {isLoading ? "Saving..." : "Save"}
      </Button>
      <button
        className={cn(
          "text-foreground/40 text-xs transition-colors hover:text-destructive",
          isDisconnecting && "pointer-events-none opacity-50"
        )}
        disabled={isDisconnecting}
        onClick={handleDisconnect}
        type="button"
      >
        {isDisconnecting ? "..." : "Disconnect"}
      </button>
    </div>
  );
}

function ConnectButton({
  app,
  isLoading,
  isNextDisabled,
  handleOnInitialize,
}: Pick<
  ActionButtonProps,
  "app" | "isLoading" | "isNextDisabled" | "handleOnInitialize"
>) {
  const needsSettings =
    isNextDisabled && app.settings && app.settings.length > 0;

  if (needsSettings) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button disabled size="sm">
                Connect
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Configure required settings first</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      disabled={!app.active || isLoading || isNextDisabled}
      onClick={handleOnInitialize}
      size="sm"
    >
      {isLoading ? "Connecting..." : "Connect"}
    </Button>
  );
}

type UnifiedAppSheetHeaderProps = {
  app: UnifiedApp;
  isLoading: boolean;
  disconnectOfficialAppMutation: {
    isPending: boolean;
    // biome-ignore lint/suspicious/noExplicitAny: data type varies
    mutate: (data: any) => void;
  };
  revokeExternalAppMutation: {
    isPending: boolean;
    // biome-ignore lint/suspicious/noExplicitAny: data type varies
    mutate: (data: any) => void;
  };
  handleDisconnect: () => void;
  handleOnInitialize: () => Promise<void>;
  isNextDisabled?: boolean;
  connectedAt?: Date | string | null;
};

export function UnifiedAppSheetHeader({
  app,
  isLoading,
  disconnectOfficialAppMutation,
  revokeExternalAppMutation,
  handleDisconnect,
  handleOnInitialize,
  isNextDisabled,
  connectedAt,
}: UnifiedAppSheetHeaderProps) {
  const isDisconnecting =
    disconnectOfficialAppMutation.isPending ||
    revokeExternalAppMutation.isPending;

  const categoryText =
    app.type === "external" && app.developerName
      ? `${app.category} · ${app.developerName}`
      : app.category;

  return (
    <SheetHeader className="mb-6 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo app={app} className="h-10 w-10" size={40} />
          <div>
            <div className="flex items-center gap-2.5">
              <SheetTitle className="font-semibold text-base tracking-tight">
                {app.name}
              </SheetTitle>
              {app.installed && (
                <span className="inline-flex items-center bg-emerald-500/10 px-2 py-0.5 font-medium text-[10px] text-emerald-600 dark:text-emerald-400">
                  Connected
                  {connectedAt && (
                    <span className="ml-1 text-emerald-500/60">
                      {formatDistanceToNow(new Date(connectedAt), {
                        addSuffix: false,
                      })}
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-foreground/50 text-xs">{categoryText}</p>
          </div>
        </div>

        {app.installed ? (
          <InstalledActions
            handleDisconnect={handleDisconnect}
            handleOnInitialize={handleOnInitialize}
            isDisconnecting={isDisconnecting}
            isLoading={isLoading}
            isNextDisabled={isNextDisabled}
          />
        ) : (
          <ConnectButton
            app={app}
            handleOnInitialize={handleOnInitialize}
            isLoading={isLoading}
            isNextDisabled={isNextDisabled}
          />
        )}
      </div>
    </SheetHeader>
  );
}
