"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UnifiedApp } from "@openplane/integrations";
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
import { useConnectApp, useDisconnectApp } from "@/hooks/use-apps";
import { generateFormSchema, getAppDefaultValues } from "@/lib/integrations";
import { AppLogo } from "./app-logo";
import { UnifiedAppDataTab } from "./unified-app-data-tab";
import { UnifiedAppOverviewTab } from "./unified-app-overview-tab";
import { UnifiedAppSettingsTab } from "./unified-app-settings-tab";
import { UnifiedAppSheetHeader } from "./unified-app-sheet-header";

type UnifiedAppProps = {
  app: UnifiedApp;
  userEmail?: string;
};

export function UnifiedAppComponent({ app }: UnifiedAppProps) {
  const [isLoading, setLoading] = useState(false);
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

  // Reset form when defaultValues change (e.g. after initial load or switch)
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const connectMutation = useConnectApp({
    onSuccess: () => {
      setLoading(false);
      // Close the sheet
      setParams(null);
    },
    onError: () => {
      setLoading(false);
      // Toast is handled in the hook
    },
  });

  const disconnectMutation = useDisconnectApp();

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

  const handleOnInitialize = async () => {
    // Validate form first
    const isValid = await form.trigger();
    if (!isValid) {
      // If invalid, show error and switch to settings tab
      toast.error("Please correct the errors in the settings tab.");
      setParams({ settings: true });
      return;
    }

    const configValues = form.getValues();

    setLoading(true);
    try {
      if (app.type === "official") {
        if (app.onInitialize) {
          await app.onInitialize();
        } else {
          // Default connect behavior if no custom initialize
          connectMutation.mutate({
            appId: app.id,
            workspaceExternalId: "default", // TODO: Generate or ask user
            name: app.name,
            type: app.connectorType,
            authType: app.auth.type,
            config: configValues,
          });
        }
      } else if (app.type === "external" && app.installUrl) {
        window.open(app.installUrl, "_blank");
        setLoading(false);
      }
    } catch (e) {
      console.error("Initialization failed", e);
      setLoading(false);
      toast.error("Initialization failed");
    }
  };

  return (
    <Card className="flex w-full flex-col" key={app.id}>
      <Sheet onOpenChange={() => setParams(null)} open={params.app === app.id}>
        <div className="flex h-16 items-center justify-between px-6 pt-6">
          <AppLogo app={app} size={32} />
          <div className="flex items-center gap-2">
            {app.installed && (
              <div className="bg-green-100 px-3 py-1 font-mono text-[10px] text-green-600 dark:bg-green-900 dark:text-green-300">
                Installed
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
            handleOnInitialize={handleOnInitialize}
            isLoading={isLoading || connectMutation.isPending}
            isNextDisabled={!isFormValid}
            revokeExternalAppMutation={revokeExternalAppMutation}
          />

          <ScrollArea className="h-[calc(100vh-140px)] pr-4" hideScrollbar>
            <Tabs
              className="w-full"
              defaultValue="overview"
              onValueChange={(val) =>
                setParams({ settings: val === "settings" || null })
              }
              value={params.settings ? "settings" : undefined}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="data">Data & Privacy</TabsTrigger>
                <TabsTrigger disabled={!app.settings?.length} value="settings">
                  Settings
                </TabsTrigger>
              </TabsList>

              <UnifiedAppOverviewTab app={app} />
              <UnifiedAppDataTab app={app} />
              <UnifiedAppSettingsTab
                app={app}
                form={form}
                isPending={isLoading || connectMutation.isPending}
              />
            </Tabs>

            <div className="mt-8 border-border border-t pt-6 pb-2">
              <p className="text-[#878787] text-[10px] leading-relaxed">
                All apps on the OpenPlane App Store are open-source and
                peer-reviewed. OpenPlane maintains high standards but doesn't
                endorse third-party apps. Apps published by OpenPlane are
                officially certified.
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
