"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const TABS = [
  { id: "general", label: "General", icon: Icons.Settings },
  { id: "preferences", label: "Preferences", icon: Icons.Agents },
  { id: "notifications", label: "Notifications", icon: Icons.Messages },
] as const;

type TabId = (typeof TABS)[number]["id"];

// General Settings Tab
function GeneralTab() {
  return (
    <div className="max-w-xl space-y-6">
      <div className="border border-border bg-background p-6">
        <h3 className="mb-4 font-medium text-foreground">Profile</h3>
        <p className="text-muted-foreground text-sm">
          Your profile is managed through your team settings. Contact your team
          admin to update profile information.
        </p>
      </div>

      <div className="border border-border bg-background p-6">
        <h3 className="mb-4 font-medium text-foreground">Account</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">Email</span>
            <span className="text-muted-foreground text-sm">
              Managed by SSO
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">Password</span>
            <span className="text-muted-foreground text-sm">
              Managed by SSO
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preferences Tab
function PreferencesTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery(
    trpc.preferences.get.queryOptions()
  );

  const updateMutation = useMutation(
    trpc.preferences.update.mutationOptions({
      onSuccess: () => {
        toast.success("Preferences updated");
        queryClient.invalidateQueries({
          queryKey: trpc.preferences.get.queryOptions().queryKey,
        });
      },
    })
  );

  const THEMES = [
    { value: "system" as const, label: "System" },
    { value: "light" as const, label: "Light" },
    { value: "dark" as const, label: "Dark" },
  ];

  if (isLoading) {
    return (
      <div className="max-w-xl space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const currentTheme = prefs?.theme ?? "system";
  const currentResultSize = prefs?.searchResultSize ?? 10;
  const currentRankProfile = prefs?.defaultRankProfile ?? "hybrid";

  return (
    <div className="max-w-xl space-y-6">
      <div className="border border-border bg-background p-6">
        <h3 className="mb-4 font-medium text-foreground">Appearance</h3>
        <div className="flex gap-2">
          {THEMES.map((theme) => (
            <button
              className={cn(
                "flex-1 border border-border px-4 py-2 text-sm transition-colors",
                currentTheme === theme.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-accent"
              )}
              key={theme.value}
              onClick={() => updateMutation.mutate({ theme: theme.value })}
              type="button"
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border bg-background p-6">
        <h3 className="mb-4 font-medium text-foreground">Search Behavior</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm">Results per page</p>
              <p className="text-muted-foreground text-xs">
                Number of search results to display
              </p>
            </div>
            <select
              className="border border-border bg-background p-2 text-foreground text-sm"
              onChange={(e) =>
                updateMutation.mutate({
                  searchResultSize: Number(e.target.value),
                })
              }
              value={currentResultSize}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm">Default ranking</p>
              <p className="text-muted-foreground text-xs">
                How search results are sorted
              </p>
            </div>
            <select
              className="border border-border bg-background p-2 text-foreground text-sm"
              onChange={(e) =>
                updateMutation.mutate({
                  defaultRankProfile: e.target.value as
                    | "hybrid"
                    | "semantic"
                    | "bm25"
                    | "recency",
                })
              }
              value={currentRankProfile}
            >
              <option value="hybrid">Hybrid</option>
              <option value="semantic">Semantic</option>
              <option value="bm25">Keyword</option>
              <option value="recency">Recency</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notifications Tab
function NotificationsTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery(
    trpc.preferences.get.queryOptions()
  );

  const updateMutation = useMutation(
    trpc.preferences.update.mutationOptions({
      onSuccess: () => {
        toast.success("Notification settings updated");
        queryClient.invalidateQueries({
          queryKey: trpc.preferences.get.queryOptions().queryKey,
        });
      },
    })
  );

  if (isLoading) {
    return (
      <div className="max-w-xl space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton className="h-16 w-full" key={i} />
        ))}
      </div>
    );
  }

  const emailDigestValue = prefs?.emailDigest ?? "daily";
  const searchAlertsValue = prefs?.searchAlerts ?? true;

  return (
    <div className="max-w-xl space-y-4">
      <div className="border border-border bg-background p-6">
        <h3 className="mb-4 font-medium text-foreground">
          Email Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm">Email digest</p>
              <p className="text-muted-foreground text-xs">
                Summary of activity
              </p>
            </div>
            <select
              className="border border-border bg-background p-2 text-foreground text-sm"
              onChange={(e) =>
                updateMutation.mutate({
                  emailDigest: e.target.value as
                    | "realtime"
                    | "hourly"
                    | "daily"
                    | "weekly"
                    | "never",
                })
              }
              value={emailDigestValue}
            >
              <option value="realtime">Real-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm">Search alerts</p>
              <p className="text-muted-foreground text-xs">
                Notifications for saved searches
              </p>
            </div>
            <button
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                searchAlertsValue ? "bg-primary" : "bg-muted"
              )}
              onClick={() =>
                updateMutation.mutate({ searchAlerts: !searchAlertsValue })
              }
              type="button"
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  searchAlertsValue && "translate-x-5"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "general";

  const handleTabChange = (tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-f37-stout text-xl">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-border border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={cn(
                "-mb-px flex items-center gap-2 px-4 py-3 text-sm transition-colors",
                activeTab === tab.id
                  ? "border-primary border-b-2 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              type="button"
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "general" && <GeneralTab />}
      {activeTab === "preferences" && <PreferencesTab />}
      {activeTab === "notifications" && <NotificationsTab />}
    </div>
  );
}
