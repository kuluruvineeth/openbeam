"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AuthType, type UnifiedApp } from "@openplane/connectors";
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

  // Generate Zod Schema from app settings
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
    mode: "onChange", // Validate on change for realtime feedback
  });

  // Watch all fields to trigger re-renders for validation state
  // Using form.watch() to subscribe to all changes and ensure isFormValid updates correctly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  form.watch();

  // Check validity based on form state
  const isFormValid = form.formState.isValid;
  const isDirty = form.formState.isDirty;

  // For installed apps, require both valid form AND changes made
  // For new connections, only require valid form
  const isButtonDisabled = (() => {
    if (app.installed) {
      const hasInvalidForm = !isFormValid;
      const hasNoChanges = !isDirty;
      return hasInvalidForm || hasNoChanges;
    }
    return !isFormValid;
  })();

  // Reset form when defaultValues change (e.g. after initial load or switch)
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const connectMutation = useConnectApp({
    onSuccess: () => {
      // Only close/reset if NOT redirecting to OAuth
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

  // TODO: Implement external app revoke
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

      // Redirect to Slack OAuth URL
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

    // Create the connector (saves credentials)
    const connector = await connectMutation.mutateAsync({
      appId: app.id,
      workspaceExternalId: "pending-oauth", // Will be updated by OAuth callback
      name: app.name,
      type: app.connectorType,
      authType: app.auth.type,
      config: configValues,
    });

    // If OAuth, fetch OAuth URL from backend and redirect to Slack
    if (app.auth.type === AuthType.OAUTH2) {
      await startOAuthFlow(connector.id);
      return; // Keep loading state active during redirect
    }

    // Non-OAuth apps are done
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
    // Validate form first
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please correct the errors in the settings tab.");
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
      toast.error("Please correct the errors in the settings tab.");
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
    <Card className="flex w-full flex-col" key={app.id}>
      <Sheet onOpenChange={() => setParams(null)} open={params.app === app.id}>
        <div className="flex h-16 items-center justify-between px-6 pt-6">
          <AppLogo app={app} size={32} />
          <div className="flex items-center gap-2">
            {app.installed && (
              <div className="bg-green-100 px-3 py-1 font-mono text-[10px] text-green-600 dark:bg-green-900 dark:text-green-300">
                Connected
              </div>
            )}
            {app.status && !app.installed && (
              <div className="bg-blue-100 px-3 py-1 font-mono text-[10px] text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                Connecting...
              </div>
            )}
            {app.status &&
              app.status !== "ACTIVE" &&
              app.status !== "CONNECTING" && (
                <div className="bg-red-100 px-3 py-1 font-mono text-[10px] text-red-600 dark:bg-red-900 dark:text-red-300">
                  Error
                </div>
              )}
          </div>
        </div>

        <CardHeader className="pb-0">
          <div className="flex items-center space-x-2 pb-4">
            <CardTitle className="m-0 p-0 font-medium text-md leading-none">
              {app.name}
            </CardTitle>
            {!app.active && (
              <span className="bg-[#F2F1EF] px-3 py-1 font-mono text-[#878787] text-[10px] dark:bg-[#1D1D1D]">
                Coming soon
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-4 text-[#878787] text-xs">
          <p>{app.short_description}</p>
        </CardContent>

        <div className="mt-auto px-6 pb-6">
          <Button
            className="w-full"
            disabled={!app.active}
            onClick={() => setParams({ app: app.id })}
            variant="outline"
          >
            Details
          </Button>
        </div>

        <SheetContent className="sm:max-w-[520px]">
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

          <ScrollArea className="h-[calc(100vh-140px)] pr-4" hideScrollbar>
            {isOAuthRedirecting ? (
              <OAuthLoading
                integration={app.name}
                message="Redirecting to authorize the connection"
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger
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

            <div className="mt-8 border-border border-t pt-6 pb-2">
              <p className="text-[#878787] text-[10px] leading-relaxed">
                Secured and maintained by OpenPlane
              </p>
              <div className="mt-2 flex gap-4">
                <Link
                  className="text-[10px] text-primary hover:underline"
                  href="mailto:support@openplane.tech"
                >
                  Report issue
                </Link>
                <Link
                  className="text-[10px] text-primary hover:underline"
                  href="#"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
