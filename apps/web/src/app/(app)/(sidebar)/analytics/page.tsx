"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: Icons.History },
  { id: "search", label: "Search", icon: Icons.Search },
  { id: "usage", label: "Usage", icon: Icons.Agents },
  { id: "content", label: "Content", icon: Icons.FileIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Overview Tab
function OverviewTab() {
  const STATS = [
    { label: "Total Searches", value: "24,567", change: "+12%" },
    { label: "Active Users", value: "342", change: "+8%" },
    { label: "Documents Indexed", value: "89,234", change: "+5%" },
    { label: "Avg Response Time", value: "1.2s", change: "-15%" },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div
            className="border border-border bg-background p-4"
            key={stat.label}
          >
            <p className="mb-1 text-muted-foreground text-sm">{stat.label}</p>
            <p className="mb-1 font-f37-stout text-2xl">{stat.value}</p>
            <p className="text-green-500 text-xs">
              {stat.change} vs last month
            </p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 font-medium text-foreground">Quick Access</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Top Queries", icon: Icons.Search, tab: "search" },
            { label: "User Activity", icon: Icons.Agents, tab: "usage" },
            { label: "Content Health", icon: Icons.FileIcon, tab: "content" },
          ].map((item) => (
            <Link
              className="flex items-center gap-3 border border-border bg-background p-4 transition-colors hover:border-primary/50"
              href={`/analytics?tab=${item.tab}`}
              key={item.label}
            >
              <item.icon className="text-muted-foreground" size={20} />
              <span className="font-medium text-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Search Volume Chart */}
      <div>
        <h2 className="mb-4 font-medium text-foreground">
          Search Volume Trend
        </h2>
        <div className="flex h-64 items-center justify-center border border-border bg-background">
          <div className="text-center">
            <Icons.History
              className="mx-auto mb-2 text-muted-foreground"
              size={32}
            />
            <p className="text-muted-foreground text-sm">
              Search volume chart will be displayed here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Search Analytics Tab
function SearchTab() {
  const TOP_QUERIES = [
    { query: "Q4 revenue report", count: 234, successRate: 95 },
    { query: "employee handbook", count: 189, successRate: 88 },
    { query: "product roadmap 2024", count: 156, successRate: 92 },
    { query: "onboarding checklist", count: 134, successRate: 100 },
    { query: "API documentation", count: 112, successRate: 85 },
  ];

  const NO_RESULTS = [
    { query: "unicorn project", count: 45 },
    { query: "old CRM data", count: 32 },
    { query: "competitor analysis", count: 28 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Top Queries */}
        <div>
          <h2 className="mb-4 font-medium text-foreground">Top Queries</h2>
          <div className="border border-border bg-background">
            {TOP_QUERIES.map((item, i) => (
              <div
                className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
                key={i}
              >
                <div>
                  <p className="font-medium text-foreground">{item.query}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.count} searches
                  </p>
                </div>
                <span className="text-green-500 text-sm">
                  {item.successRate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* No Results */}
        <div>
          <h2 className="mb-4 font-medium text-foreground">
            Searches with No Results
          </h2>
          <div className="border border-border bg-background">
            {NO_RESULTS.map((item, i) => (
              <div
                className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
                key={i}
              >
                <p className="font-medium text-foreground">{item.query}</p>
                <span className="text-muted-foreground text-sm">
                  {item.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Usage Analytics Tab
function UsageTab() {
  const FEATURE_ADOPTION = [
    { feature: "Search", adoption: 94 },
    { feature: "Chat", adoption: 72 },
    { feature: "Agents", adoption: 45 },
    { feature: "Collections", adoption: 38 },
    { feature: "Actions", adoption: 12 },
  ];

  const TOP_USERS = [
    { name: "John Smith", searches: 567 },
    { name: "Sarah Johnson", searches: 432 },
    { name: "Mike Chen", searches: 389 },
    { name: "Emily Davis", searches: 312 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Feature Adoption */}
        <div>
          <h2 className="mb-4 font-medium text-foreground">Feature Adoption</h2>
          <div className="space-y-3">
            {FEATURE_ADOPTION.map((item) => (
              <div
                className="border border-border bg-background p-4"
                key={item.feature}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {item.feature}
                  </span>
                  <span className="text-foreground">{item.adoption}%</span>
                </div>
                <div className="h-2 bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${item.adoption}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div>
          <h2 className="mb-4 font-medium text-foreground">
            Most Active Users
          </h2>
          <div className="border border-border bg-background">
            {TOP_USERS.map((user, i) => (
              <div
                className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
                key={i}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                    <span className="font-medium">{user.name.charAt(0)}</span>
                  </div>
                  <span className="text-foreground">{user.name}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {user.searches} searches
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Content Analytics Tab
function ContentTab() {
  const STALE_DOCS = [
    { title: "2023 Product Roadmap", lastUpdated: "Jan 15, 2023", views: 45 },
    { title: "Old API Documentation", lastUpdated: "Mar 8, 2023", views: 32 },
    { title: "Legacy System Guide", lastUpdated: "Feb 22, 2023", views: 28 },
  ];

  const SOURCES = [
    { source: "Google Drive", count: 15_234, health: 82 },
    { source: "Confluence", count: 8921, health: 75 },
    { source: "Notion", count: 6432, health: 91 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Stale Content */}
        <div>
          <h2 className="mb-4 font-medium text-foreground">Stale Content</h2>
          <div className="border border-border bg-background">
            {STALE_DOCS.map((doc, i) => (
              <div
                className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
                key={i}
              >
                <div>
                  <p className="font-medium text-foreground">{doc.title}</p>
                  <p className="text-muted-foreground text-xs">
                    Last updated: {doc.lastUpdated}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm">
                  {doc.views} views
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source Health */}
        <div>
          <h2 className="mb-4 font-medium text-foreground">Source Health</h2>
          <div className="space-y-3">
            {SOURCES.map((source) => (
              <div
                className="flex items-center justify-between border border-border bg-background p-4"
                key={source.source}
              >
                <div className="flex items-center gap-3">
                  <Icons.ConnectorIcon
                    className="text-muted-foreground"
                    size={20}
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      {source.source}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {source.count.toLocaleString()} documents
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 bg-muted">
                    <div
                      className={cn(
                        "h-full",
                        source.health > 80 ? "bg-green-500" : "bg-yellow-500"
                      )}
                      style={{ width: `${source.health}%` }}
                    />
                  </div>
                  <span className="text-foreground text-sm">
                    {source.health}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "overview";

  const handleTabChange = (tab: TabId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.push(url.pathname + url.search, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-6xl py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Insights into search, usage, and content health
          </p>
        </div>
        <Button variant="outline">
          <Icons.FileTextIcon className="mr-2" size={16} />
          Export Report
        </Button>
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
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "search" && <SearchTab />}
      {activeTab === "usage" && <UsageTab />}
      {activeTab === "content" && <ContentTab />}
    </div>
  );
}
