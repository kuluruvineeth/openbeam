"use client";

import { appStore as appStoreApps } from "@openplane/integrations";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppsQuery } from "@/hooks/use-apps";
import { useUserQuery } from "@/hooks/use-user";
import {
  type AuthorizedApp,
  type ExternalApp,
  transformExternalApp,
} from "@/lib/integrations";
import { UnifiedAppComponent } from "./unified-app";

export function Integrations() {
  const { data: user } = useUserQuery();
  const router = useRouter();

  // Fetch apps from custom hook
  const { data: serverApps } = useAppsQuery();

  // Placeholder data until TRPC routes are implemented
  const externalAppsData: { data: ExternalApp[] } = { data: [] };
  const authorizedExternalApps: { data: AuthorizedApp[] } = { data: [] };

  const searchParams = useSearchParams();
  const isInstalledPage = searchParams.get("tab") === "connected";
  const search = searchParams.get("q");

  // Combine and filter apps
  const filteredApps = [
    // Transform official apps
    ...appStoreApps.map((clientApp) => {
      const serverApp = serverApps.find((app) => app.id === clientApp.id);
      return {
        ...clientApp,
        installed: serverApp?.installed ?? false,
        userSettings: serverApp?.userSettings,
        connectorId: serverApp?.connectorId,
        logo: clientApp.logo,
        onInitialize: clientApp.onInitialize,
        type: "official" as const,
      };
    }),
    // Transform external apps (only approved ones)
    ...(
      externalAppsData?.data?.filter((app) => app.status === "approved") || []
    ).map((app) => transformExternalApp(app, authorizedExternalApps)),
  ].filter((app) => {
    const matchesTab = !isInstalledPage || app.installed;
    const matchesSearch =
      !search || app.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="mx-auto mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {filteredApps.map((app) => (
        <UnifiedAppComponent
          app={app}
          key={app.id}
          userEmail={user?.email || undefined}
        />
      ))}

      {!(search || filteredApps.length) && (
        <div className="col-span-full flex h-[calc(100vh-400px)] flex-col items-center justify-center">
          <h3 className="font-semibold text-[#1D1D1D] text-lg dark:text-[#F2F1EF]">
            No apps installed
          </h3>
          <p className="mt-2 max-w-md text-center text-[#878787] text-sm">
            You haven't installed any apps yet. Go to the 'All Apps' tab to
            browse available apps.
          </p>
        </div>
      )}

      {search && !filteredApps.length && (
        <div className="col-span-full flex h-[calc(100vh-400px)] flex-col items-center justify-center">
          <h3 className="font-semibold text-[#1D1D1D] text-lg dark:text-[#F2F1EF]">
            No apps found
          </h3>
          <p className="mt-2 max-w-md text-center text-[#878787] text-sm">
            No apps found for your search, let us know if you want to see a
            specific app in the app store.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/integrations")}
            variant="outline"
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
