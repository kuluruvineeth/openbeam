"use client";

import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function OnboardingCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Celebrate!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="w-full max-w-lg text-center">
      <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center bg-green-500/10">
        <Icons.CheckIcon className="text-green-500" size={48} />
      </div>

      <h1 className="mb-4 font-f37-stout text-3xl">You're all set!</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Your workspace is ready. Start exploring your knowledge base and
        discover insights across all your apps.
      </p>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="border border-border bg-background p-4">
          <Icons.Search className="mx-auto mb-2 text-primary" size={24} />
          <p className="font-medium text-foreground text-sm">Search</p>
          <p className="text-muted-foreground text-xs">Find anything</p>
        </div>
        <div className="border border-border bg-background p-4">
          <Icons.Messages className="mx-auto mb-2 text-primary" size={24} />
          <p className="font-medium text-foreground text-sm">Chat</p>
          <p className="text-muted-foreground text-xs">Ask questions</p>
        </div>
        <div className="border border-border bg-background p-4">
          <Icons.ConnectorIcon
            className="mx-auto mb-2 text-primary"
            size={24}
          />
          <p className="font-medium text-foreground text-sm">Connect</p>
          <p className="text-muted-foreground text-xs">Add more apps</p>
        </div>
      </div>

      <Button className="w-full" onClick={() => router.push("/")} size="lg">
        Start Exploring
        <Icons.ArrowRight className="ml-2" size={18} />
      </Button>
    </div>
  );
}
