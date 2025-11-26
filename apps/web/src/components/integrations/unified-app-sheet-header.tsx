"use client";

import type { UnifiedApp } from "@openplane/connectors";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppLogo } from "./app-logo";

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
};

export function UnifiedAppSheetHeader({
  app,
  isLoading,
  disconnectOfficialAppMutation,
  revokeExternalAppMutation,
  handleDisconnect,
  handleOnInitialize,
  isNextDisabled,
}: UnifiedAppSheetHeaderProps) {
  const connectButton = (
    <Button
      disabled={!app.active || isLoading || isNextDisabled}
      onClick={handleOnInitialize}
      variant="default"
    >
      {isLoading ? "Connecting..." : "Connect"}
    </Button>
  );

  const updateButton = (
    <Button
      disabled={isLoading || isNextDisabled}
      onClick={handleOnInitialize}
      variant="default"
    >
      {isLoading ? "Saving..." : "Save Settings"}
    </Button>
  );

  const renderActionButton = () => {
    if (app.installed) {
      return (
        <div className="flex gap-2">
          {updateButton}
          <Button
            disabled={
              disconnectOfficialAppMutation.isPending ||
              revokeExternalAppMutation.isPending
            }
            onClick={handleDisconnect}
            variant="outline"
          >
            {disconnectOfficialAppMutation.isPending ||
            revokeExternalAppMutation.isPending
              ? "Disconnecting..."
              : "Disconnect"}
          </Button>
        </div>
      );
    }

    if (isNextDisabled && app.settings && app.settings.length > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed opacity-50">
                <Button disabled variant="default">
                  Connect
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Please configure required settings first</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return connectButton;
  };

  return (
    <SheetHeader className="mb-4">
      <div className="flex items-center justify-between border-border border-b pb-4">
        <div className="flex items-center space-x-3">
          <AppLogo app={app} className="h-10 w-10" size={40} />
          <div>
            <div className="flex items-center space-x-2">
              <SheetTitle className="text-xl">{app.name}</SheetTitle>
              {app.installed && (
                <div className="size-1.5 rounded-full bg-green-600 dark:bg-green-300" />
              )}
            </div>
            <span className="text-[#878787] text-xs">
              {app.category}
              {app.type === "external" ? ` • By ${app.developerName}` : ""}
            </span>
          </div>
        </div>

        <div>{renderActionButton()}</div>
      </div>
    </SheetHeader>
  );
}
