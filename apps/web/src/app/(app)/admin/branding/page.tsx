"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLORS = [
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function BrandingPage() {
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [logoUrl, setLogoUrl] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // TODO: Implement via tRPC
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Branding settings saved");
    setIsLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-f37-stout text-xl">Custom Branding</h1>
        <p className="text-muted-foreground text-sm">
          Customize the look and feel of your workspace
        </p>
      </div>

      {/* Preview */}
      <section className="mb-8">
        <h2 className="mb-4 font-medium text-foreground">Preview</h2>
        <div
          className="flex h-32 items-center justify-center border border-border"
          style={{ backgroundColor: `${primaryColor}10` }}
        >
          <div className="text-center">
            <div
              className="mx-auto mb-2 flex h-12 w-12 items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Icons.Logo className="text-white" size={24} />
            </div>
            <p className="font-medium" style={{ color: primaryColor }}>
              {companyName || "Your Company"}
            </p>
          </div>
        </div>
      </section>

      {/* Company Name */}
      <div className="mb-6">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Company Name
        </label>
        <Input
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Your Company Name"
          value={companyName}
        />
      </div>

      {/* Primary Color */}
      <div className="mb-6">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Primary Color
        </label>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                className="h-8 w-8 transition-transform hover:scale-110"
                key={color}
                onClick={() => setPrimaryColor(color)}
                style={{
                  backgroundColor: color,
                  outline:
                    primaryColor === color ? "2px solid currentColor" : "none",
                  outlineOffset: "2px",
                }}
                type="button"
              />
            ))}
          </div>
          <Input
            className="w-32"
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#000000"
            value={primaryColor}
          />
        </div>
      </div>

      {/* Logo URL */}
      <div className="mb-6">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Logo URL
        </label>
        <Input
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
          value={logoUrl}
        />
        <p className="mt-2 text-muted-foreground text-xs">
          Recommended size: 200x50px, PNG or SVG
        </p>
      </div>

      {/* Login Message */}
      <div className="mb-8">
        <label className="mb-2 block font-medium text-foreground text-sm">
          Login Page Message
        </label>
        <textarea
          className="h-24 w-full resize-none border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          onChange={(e) => setLoginMessage(e.target.value)}
          placeholder="Welcome message shown on the login page..."
          value={loginMessage}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="flex-1" variant="outline">
          Reset to Default
        </Button>
        <Button className="flex-1" disabled={isLoading} onClick={handleSave}>
          {isLoading ? (
            <>
              <Icons.Spinner className="mr-2 animate-spin" size={16} />
              Saving...
            </>
          ) : (
            "Save Branding"
          )}
        </Button>
      </div>
    </div>
  );
}
