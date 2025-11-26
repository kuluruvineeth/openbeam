"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function OnboardingInvitePage() {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!emails.trim()) {
      router.push("/onboarding/tour");
      return;
    }

    setIsInviting(true);
    // TODO: Implement invite via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsInviting(false);
    router.push("/onboarding/tour");
  };

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-f37-stout text-2xl">Invite your team</h1>
        <p className="text-muted-foreground">
          OpenPlane is better with teammates. Invite them now or do it later.
        </p>
      </div>

      <div className="mb-6">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Email addresses
        </label>
        <textarea
          className="h-32 w-full resize-none border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          onChange={(e) => setEmails(e.target.value)}
          placeholder="Enter email addresses, one per line"
          value={emails}
        />
        <p className="mt-2 text-muted-foreground text-xs">
          Separate multiple emails with commas or new lines
        </p>
      </div>

      <div className="mb-8 border border-border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <Icons.LinkIcon className="text-muted-foreground" size={20} />
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">
              Share invite link
            </p>
            <p className="text-muted-foreground text-xs">
              Anyone with this link can join your team
            </p>
          </div>
          <Button size="sm" variant="outline">
            Copy Link
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1"
          onClick={() => router.push("/onboarding/tour")}
          variant="outline"
        >
          Skip for now
        </Button>
        <Button className="flex-1" disabled={isInviting} onClick={handleInvite}>
          {isInviting ? (
            <>
              <Icons.Spinner className="mr-2 animate-spin" size={16} />
              Sending...
            </>
          ) : emails.trim() ? (
            <>
              Send Invites
              <Icons.ArrowRight className="ml-2" size={16} />
            </>
          ) : (
            <>
              Continue
              <Icons.ArrowRight className="ml-2" size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
