"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function InviteMembersPage() {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement invite via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Invitations sent!");
    setIsLoading(false);
    router.push("/admin/members");
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          onClick={() => router.push("/admin/members")}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Invite Members</h1>
          <p className="text-muted-foreground text-sm">
            Send invitations to new team members
          </p>
        </div>
      </div>

      <form onSubmit={handleInvite}>
        {/* Emails */}
        <div className="mb-6">
          <label className="mb-2 block font-medium text-foreground text-sm">
            Email Addresses
          </label>
          <textarea
            className="h-32 w-full resize-none border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(e) => setEmails(e.target.value)}
            placeholder="Enter email addresses, one per line or comma-separated"
            value={emails}
          />
          <p className="mt-2 text-muted-foreground text-xs">
            You can invite multiple people at once
          </p>
        </div>

        {/* Role */}
        <div className="mb-8">
          <label className="mb-2 block font-medium text-foreground text-sm">
            Role
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              className={cn(
                "flex flex-col items-center border p-4 text-sm transition-colors",
                role === "MEMBER"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRole("MEMBER")}
              type="button"
            >
              <Icons.Agents className="mb-2" size={24} />
              <span className="font-medium">Member</span>
              <span className="mt-1 text-xs">
                Can search and use AI features
              </span>
            </button>
            <button
              className={cn(
                "flex flex-col items-center border p-4 text-sm transition-colors",
                role === "ADMIN"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRole("ADMIN")}
              type="button"
            >
              <Icons.ShieldIcon className="mb-2" size={24} />
              <span className="font-medium">Admin</span>
              <span className="mt-1 text-xs">
                Can manage settings and members
              </span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={() => router.back()}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!emails.trim() || isLoading}
            type="submit"
          >
            {isLoading ? (
              <>
                <Icons.Spinner className="mr-2 animate-spin" size={16} />
                Sending...
              </>
            ) : (
              "Send Invitations"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
