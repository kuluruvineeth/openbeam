"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AuthType, type UnifiedApp } from "@openplane/integrations";
import Link from "next/link";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useConnectApp,
  useDisconnectApp,
  useUpdateAppSettings,
} from "@/hooks/use-apps";
import { apiClient } from "@/lib/api-client";
import { generateFormSchema, getAppDefaultValues } from "@/lib/integrations";
import { AppLogo } from "./app-logo";
import { OAuthLoading } from "./oauth-loading";
import { UnifiedAppOverviewTab } from "./unified-app-overview-tab";
import { UnifiedAppSettingsTab } from "./unified-app-settings-tab";
import { UnifiedAppSheetHeader } from "./unified-app-sheet-header";

type UnifiedAppProps = {
  app: UnifiedApp;
  userEmail?: string;
};

export function UnifiedAppComponent({ app }: UnifiedAppProps) {
  const [isLoading, setLoading] = useState(false);
  const [isOAuthRedirecting, setIsOAuthRedirecting] = useState(false);
  const [params, setParams] = useQueryStates({
    app: parseAsString,
    settings: parseAsBoolean,
  });

  const formSchema = useMemo(
    () => generateFormSchema(app.settings),
    [app.settings]
  );

  const defaultValues = useMemo(
    () => getAppDefaultValues(app),
    [app.settings, app.userSettings]
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  form.watch();

  const isFormValid = form.formState.isValid;
  const isDirty = form.formState.isDirty;

  const isButtonDisabled = (() => {
    if (app.installed) {
      return !(isFormValid && isDirty);
    }
    return !isFormValid;
  })();

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const connectMutation = useConnectApp({
    onSuccess: () => {
      if (app.auth.type !== AuthType.OAUTH2) {
        setLoading(false);
        setParams(null);
      }
    },
    onError: () => {
      setLoading(false);
      toast.error("Failed to connect app");
    },
  });

  const disconnectMutation = useDisconnectApp({
    onSuccess: () => {
      toast.success("App disconnected successfully");
      setParams(null);
    },
    onError: () => {
      toast.error("Failed to disconnect app");
    },
  });

  const updateSettingsMutation = useUpdateAppSettings({
    onSuccess: () => {
      toast.success("Settings updated successfully");
      setLoading(false);
      setParams(null);
    },
    onError: () => {
      toast.error("Failed to update settings");
      setLoading(false);
    },
  });

  const revokeExternalAppMutation = {
    // biome-ignore lint/suspicious/noExplicitAny: data type varies
    mutate: (data: any) => console.log("Revoke external app", data),
    isPending: false,
  };

  const handleDisconnect = () => {
    if (app.type === "official") {
      if (app.connectorId) {
        disconnectMutation.mutate({ appId: app.connectorId });
      } else {
        console.error("No connector ID found for installed app");
        toast.error("Error: Connector ID missing");
      }
    } else {
      revokeExternalAppMutation.mutate({ applicationId: app.id });
    }
  };

  const startOAuthFlow = async (connectorId: string) => {
    setIsOAuthRedirecting(true);
    try {
      const appId = app.id.toLowerCase();
      const data = await apiClient.get<{
        success: boolean;
        oauthUrl?: string;
        message?: string;
      }>(`/integrations/${appId}/oauth/start?connectorId=${connectorId}`);

      if (!(data.success && data.oauthUrl)) {
        throw new Error(data.message || "Failed to get OAuth URL");
      }

      window.location.href = data.oauthUrl;
    } catch (error) {
      console.error("OAuth start failed", error);
      setIsOAuthRedirecting(false);
      setLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start OAuth flow";
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleOfficialApp = async (configValues: Record<string, unknown>) => {
    if (app.onInitialize) {
      await app.onInitialize();
      return;
    }

    const connector = await connectMutation.mutateAsync({
      appId: app.id,
      workspaceExternalId: "pending-oauth",
      name: app.name,
      type: app.connectorType,
      authType: app.auth.type,
      config: configValues,
    });

    if (app.auth.type === AuthType.OAUTH2) {
      await startOAuthFlow(connector.id);
      return;
    }

    toast.success("App connected successfully");
    setLoading(false);
    setParams(null);
  };

  const handleExternalApp = () => {
    if (app.installUrl) {
      window.open(app.installUrl, "_blank");
      setLoading(false);
    }
  };

  const handleOnInitialize = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please configure required settings first");
      setParams({ settings: true });
      return;
    }

    const configValues = form.getValues();
    setLoading(true);

    try {
      if (app.type === "official") {
        await handleOfficialApp(configValues);
      } else if (app.type === "external") {
        handleExternalApp();
      }
    } catch (e) {
      console.error("Initialization failed", e);
      setLoading(false);
      if (app.auth.type !== AuthType.OAUTH2) {
        toast.error("Initialization failed");
      }
    }
  };

  const handleUpdateSettings = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please correct the errors in settings");
      return;
    }

    if (!app.connectorId) {
      toast.error("No connector found");
      return;
    }

    const configValues = form.getValues();
    setLoading(true);

    updateSettingsMutation.mutate({
      appId: app.connectorId,
      config: configValues,
    });
  };

  return (
    <Card
      className="group relative flex flex-col border-border/50 transition-all duration-200 hover:border-border hover:shadow-sm"
      key={app.id}
    >
      <Sheet onOpenChange={() => setParams(null)} open={params.app === app.id}>
        <CardHeader className="flex flex-row items-start justify-between p-5 pb-3">
          <AppLogo app={app} size={36} />
          {app.installed && (
            <div className="flex h-5 items-center gap-1.5 bg-emerald-500/10 px-2 font-medium text-[10px] text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 bg-emerald-500" />
              Connected
            </div>
          )}
          {app.status && !app.installed && (
            <div className="flex h-5 items-center gap-1.5 bg-blue-500/10 px-2 font-medium text-[10px] text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 animate-pulse bg-blue-500" />
              Connecting
            </div>
          )}
          {app.status &&
            app.status !== "ACTIVE" &&
            app.status !== "CONNECTING" && (
              <div className="flex h-5 items-center gap-1.5 bg-destructive/10 px-2 font-medium text-[10px] text-destructive">
                <span className="h-1.5 w-1.5 bg-destructive" />
                Error
              </div>
            )}
        </CardHeader>

        <CardContent className="flex-1 px-5 pt-0 pb-4">
          <div className="flex items-center gap-2">
            <CardTitle className="font-medium text-sm tracking-tight">
              {app.name}
            </CardTitle>
            {!app.active && (
              <span className="bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                Soon
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {app.short_description}
          </p>
        </CardContent>

        {/* Card Footer */}
        <div className="border-border/50 border-t p-4">
          <Button
            className="w-full"
            disabled={!app.active}
            onClick={() => setParams({ app: app.id })}
            size="sm"
            variant="outline"
          >
            View Details
          </Button>
        </div>

        {/* Sheet */}
        <SheetContent className="flex flex-col sm:max-w-[480px]">
          <UnifiedAppSheetHeader
            app={app}
            disconnectOfficialAppMutation={disconnectMutation}
            handleDisconnect={handleDisconnect}
            handleOnInitialize={
              app.installed ? handleUpdateSettings : handleOnInitialize
            }
            isLoading={
              isLoading ||
              connectMutation.isPending ||
              updateSettingsMutation.isPending
            }
            isNextDisabled={isButtonDisabled}
            revokeExternalAppMutation={revokeExternalAppMutation}
          />

          <ScrollArea className="-mr-4 flex-1 pr-4" hideScrollbar>
            {isOAuthRedirecting ? (
              <OAuthLoading
                integration={app.name}
                message="Redirecting to authorize"
                state="connecting"
              />
            ) : (
              <Tabs
                className="w-full"
                defaultValue="overview"
                onValueChange={(val) =>
                  setParams({ settings: val === "settings" || null })
                }
                value={params.settings ? "settings" : undefined}
              >
                <TabsList className="grid w-full grid-cols-2 bg-secondary/40">
                  <TabsTrigger
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    value="overview"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    disabled={!app.settings?.length}
                    value="settings"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>

                <UnifiedAppOverviewTab app={app} />
                <UnifiedAppSettingsTab
                  app={app}
                  form={form}
                  isPending={isLoading || connectMutation.isPending}
                />
              </Tabs>
            )}

            {/* Footer */}
            <div className="mt-10 flex items-center justify-between border-t pt-5 pb-4">
              <p className="text-[10px] text-muted-foreground/60">
                Secured by OpenPlane
              </p>
              <div className="flex gap-4">
                <Link
                  className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  href="mailto:support@openplane.tech"
                >
                  Report issue
                </Link>
                <Link
                  className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  href="#"
                >
                  Privacy
                </Link>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
