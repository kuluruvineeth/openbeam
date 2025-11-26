"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONNECTORS = [
  { id: "google_drive", name: "Google Drive", icon: "📁", popular: true },
  { id: "slack", name: "Slack", icon: "💬", popular: true },
  { id: "notion", name: "Notion", icon: "📝", popular: true },
  { id: "confluence", name: "Confluence", icon: "📚", popular: true },
  { id: "github", name: "GitHub", icon: "🐙", popular: false },
  { id: "jira", name: "Jira", icon: "🎯", popular: false },
];

export default function OnboardingConnectPage() {
  const router = useRouter();
  const [selectedConnector, setSelectedConnector] = useState<string | null>(
    null
  );
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!selectedConnector) return;
    setIsConnecting(true);

    // TODO: Implement actual OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsConnecting(false);
    router.push("/onboarding/invite");
  };

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-f37-stout text-2xl">Connect your first app</h1>
        <p className="text-muted-foreground">
          Choose an app to connect. You can add more later.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3">
        {CONNECTORS.map((connector) => (
          <button
            className={cn(
              "flex items-center gap-3 border p-4 text-left transition-colors",
              selectedConnector === connector.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            key={connector.id}
            onClick={() => setSelectedConnector(connector.id)}
            type="button"
          >
            <span className="text-2xl">{connector.icon}</span>
            <div>
              <p className="font-medium text-foreground">{connector.name}</p>
              {connector.popular && (
                <p className="text-muted-foreground text-xs">Popular</p>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1"
          onClick={() => router.push("/onboarding/invite")}
          variant="outline"
        >
          Skip for now
        </Button>
        <Button
          className="flex-1"
          disabled={!selectedConnector || isConnecting}
          onClick={handleConnect}
        >
          {isConnecting ? (
            <>
              <Icons.Spinner className="mr-2 animate-spin" size={16} />
              Connecting...
            </>
          ) : (
            <>
              Connect
              <Icons.ArrowRight className="ml-2" size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
