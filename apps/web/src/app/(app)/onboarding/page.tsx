"use client";

import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function OnboardingWelcomePage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-lg text-center">
      <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center bg-primary/10">
        <Icons.Sparkle className="text-primary" size={40} />
      </div>

      <h1 className="mb-4 font-f37-stout text-3xl">Welcome to OpenPlane</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Let's get you set up in just a few minutes. We'll help you connect your
        data sources and invite your team.
      </p>

      <div className="mb-8 space-y-4 text-left">
        <div className="flex items-start gap-4 border border-border bg-background p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
            <Icons.ConnectorIcon size={20} />
          </div>
          <div>
            <h3 className="mb-1 font-medium text-foreground">
              Connect your data
            </h3>
            <p className="text-muted-foreground text-sm">
              Connect Google Drive, Slack, Notion, and more
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 border border-border bg-background p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
            <Icons.Agents size={20} />
          </div>
          <div>
            <h3 className="mb-1 font-medium text-foreground">
              Invite your team
            </h3>
            <p className="text-muted-foreground text-sm">
              Collaborate with your teammates
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 border border-border bg-background p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
            <Icons.Search size={20} />
          </div>
          <div>
            <h3 className="mb-1 font-medium text-foreground">
              Start searching
            </h3>
            <p className="text-muted-foreground text-sm">
              Find anything across all your apps instantly
            </p>
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => router.push("/onboarding/connect")}
        size="lg"
      >
        Get Started
        <Icons.ArrowRight className="ml-2" size={18} />
      </Button>
    </div>
  );
}
