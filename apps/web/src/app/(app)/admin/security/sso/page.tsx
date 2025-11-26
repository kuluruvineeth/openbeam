"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export default function SSOConfigPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const [protocol, setProtocol] = useState<"SAML" | "OIDC">("SAML");
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [ssoUrl, setSsoUrl] = useState("");
  const [clientId, setClientId] = useState("");

  // Fetch existing config
  const { data: ssoConfig } = useQuery(
    trpc.enterprise.getSSOConfig.queryOptions()
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement via tRPC mutation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("SSO configuration saved");
    setIsLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          onClick={() => router.push("/admin/security")}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="mb-1 font-f37-stout text-xl">Single Sign-On</h1>
          <p className="text-muted-foreground text-sm">
            Configure SSO authentication for your workspace
          </p>
        </div>
      </div>

      {/* Protocol Selection */}
      <div className="mb-8">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Protocol
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            className={cn(
              "border p-4 text-left transition-colors",
              protocol === "SAML"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setProtocol("SAML")}
            type="button"
          >
            <h3 className="mb-1 font-medium text-foreground">SAML 2.0</h3>
            <p className="text-muted-foreground text-sm">
              Enterprise standard for SSO
            </p>
          </button>
          <button
            className={cn(
              "border p-4 text-left transition-colors",
              protocol === "OIDC"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setProtocol("OIDC")}
            type="button"
          >
            <h3 className="mb-1 font-medium text-foreground">OpenID Connect</h3>
            <p className="text-muted-foreground text-sm">
              Modern OAuth 2.0 based
            </p>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Connection Name */}
        <div className="mb-6">
          <label className="mb-2 block font-medium text-foreground text-sm">
            Connection Name
          </label>
          <Input
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Company SSO"
            value={name}
          />
        </div>

        {protocol === "SAML" ? (
          <>
            {/* SAML Fields */}
            <div className="mb-6">
              <label className="mb-2 block font-medium text-foreground text-sm">
                Identity Provider Issuer
              </label>
              <Input
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="https://idp.example.com"
                value={issuer}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-medium text-foreground text-sm">
                SSO URL
              </label>
              <Input
                onChange={(e) => setSsoUrl(e.target.value)}
                placeholder="https://idp.example.com/sso"
                value={ssoUrl}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-medium text-foreground text-sm">
                X.509 Certificate
              </label>
              <textarea
                className="h-32 w-full resize-none border border-border bg-background p-3 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Paste your certificate here..."
              />
            </div>
          </>
        ) : (
          <>
            {/* OIDC Fields */}
            <div className="mb-6">
              <label className="mb-2 block font-medium text-foreground text-sm">
                Client ID
              </label>
              <Input
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Your OIDC client ID"
                value={clientId}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-medium text-foreground text-sm">
                Client Secret
              </label>
              <Input placeholder="Your OIDC client secret" type="password" />
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-medium text-foreground text-sm">
                Discovery URL
              </label>
              <Input placeholder="https://idp.example.com/.well-known/openid-configuration" />
            </div>
          </>
        )}

        {/* Service Provider Info */}
        <div className="mb-8 border border-border bg-muted/50 p-4">
          <h3 className="mb-3 font-medium text-foreground text-sm">
            Service Provider Details
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ACS URL:</span>
              <span className="text-foreground">
                https://app.openplane.tech/api/auth/sso/callback
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entity ID:</span>
              <span className="text-foreground">
                https://app.openplane.tech
              </span>
            </div>
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
          <Button className="flex-1" disabled={isLoading} type="submit">
            {isLoading ? (
              <>
                <Icons.Spinner className="mr-2 animate-spin" size={16} />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
