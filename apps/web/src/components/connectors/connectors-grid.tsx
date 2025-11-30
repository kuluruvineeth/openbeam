"use client";

import {
  appStore as appStoreApps,
  type SettingValue,
} from "@openplane/integrations";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAppsQuery } from "@/hooks/use-apps";
import { useUserQuery } from "@/hooks/use-user";
import {
  type AuthorizedApp,
  type ExternalApp,
  transformExternalApp,
} from "@/lib/integrations";
import { cn } from "@/lib/utils";
import { UnifiedAppComponent } from "../integrations/unified-app";

export function ConnectorsGrid() {
  const { data: user } = useUserQuery();
  const router = useRouter();

  const { data: serverApps } = useAppsQuery();

  const externalAppsData: { data: ExternalApp[] } = { data: [] };
  const authorizedExternalApps: { data: AuthorizedApp[] } = { data: [] };

  const searchParams = useSearchParams();
  const search = searchParams.get("q");

  const filteredApps = [
    ...appStoreApps.map((clientApp) => {
      const serverApp = serverApps.find((app) => app.id === clientApp.id);
      return {
        ...clientApp,
        installed: serverApp?.installed ?? false,
        userSettings: serverApp?.userSettings as
          | Record<string, SettingValue>
          | undefined,
        connectorId: serverApp?.connectorId,
        logo: clientApp.logo,
        onInitialize: clientApp.onInitialize,
        type: "official" as const,
      };
    }),
    ...(
      externalAppsData?.data?.filter((app) => app.status === "approved") || []
    ).map((app) => transformExternalApp(app, authorizedExternalApps)),
  ].filter((app) => {
    const matchesSearch =
      !search || app.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="mx-auto mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {filteredApps.map((app, index) => (
        <div
          className={cn(
            "fade-in slide-in-from-bottom-4 animate-in fill-mode-backwards",
            "duration-500 ease-out"
          )}
          key={app.id}
          style={{
            animationDelay: `${Math.min(index * 50, 400)}ms`,
          }}
        >
          <UnifiedAppComponent app={app} userEmail={user?.email || undefined} />
        </div>
      ))}

      {!(search || filteredApps.length) && (
        <div className="col-span-full flex h-[calc(100vh-400px)] flex-col items-center justify-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-border/60 bg-background">
            <Icons.Integrations className="text-foreground/40" size={24} />
          </div>
          <h3 className="font-medium text-foreground text-lg">
            No apps available
          </h3>
          <p className="mt-2 max-w-md text-center text-foreground/50 text-sm">
            No apps are currently available in the app store.
          </p>
        </div>
      )}

      {search && !filteredApps.length && (
        <div className="col-span-full flex h-[calc(100vh-400px)] flex-col items-center justify-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-border/60 bg-background">
            <Icons.Search className="text-foreground/40" size={24} />
          </div>
          <h3 className="font-medium text-foreground text-lg">No apps found</h3>
          <p className="mt-2 max-w-md text-center text-foreground/50 text-sm">
            No apps found for "{search}"
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/connectors?tab=available")}
            variant="outline"
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
