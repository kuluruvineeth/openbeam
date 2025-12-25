"use client";

import {
  appStore as appStoreApps,
  type SettingValue,
} from "@openplane/integrations";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { useAppsQuery } from "@/hooks/use-apps";
import { useUserQuery } from "@/hooks/use-user";
import {
  type AuthorizedApp,
  type ExternalApp,
  transformExternalApp,
} from "@/lib/integrations";
import { Button } from "../ui/button";
import { UnifiedAppComponent } from "./unified-app";

export function Integrations() {
  const { data: user } = useUserQuery();

  const { data: serverApps } = useAppsQuery();

  const externalAppsData: { data: ExternalApp[] } = { data: [] };
  const authorizedExternalApps: { data: AuthorizedApp[] } = { data: [] };

  const searchParams = useSearchParams();
  const isInstalledPage = searchParams.get("tab") === "connected";
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
    const matchesTab = !isInstalledPage || app.installed;
    const matchesSearch =
      !search || app.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (search && !filteredApps.length) {
    return (
      <div className="flex h-[calc(100vh-400px)] flex-col items-center justify-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center bg-secondary/60">
          <Icons.SearchIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No results</h3>
        <p className="mt-1 max-w-xs text-center text-muted-foreground text-sm">
          No apps found matching "{search}"
        </p>
        <Link className="mt-4" href="/connectors?tab=available">
          <Button variant="outline">Clear search</Button>
        </Link>
      </div>
    );
  }

  if (!(search || filteredApps.length)) {
    return (
      <div className="flex h-[calc(100vh-400px)] flex-col items-center justify-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center bg-secondary/60">
          <Icons.ConnectorIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No apps connected</h3>
        <p className="mt-1 max-w-xs text-center text-muted-foreground text-sm">
          Browse available apps to connect your first integration
        </p>
        <Link className="mt-4" href="/connectors?tab=available">
          <Button variant="outline">Browse apps</Button>
        </Link>
      </div>
    );
  }

  return (
    <ul
      aria-label="Integrations"
      className="mt-6 grid list-none grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
    >
      {filteredApps.map((app) => (
        <li key={app.id}>
          <UnifiedAppComponent app={app} userEmail={user?.email || undefined} />
        </li>
      ))}
    </ul>
  );
}
