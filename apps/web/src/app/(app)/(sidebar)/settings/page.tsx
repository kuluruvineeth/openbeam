import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "General Settings | OpenPlane",
  description: "Manage your general settings",
};

export default function SettingsPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">General Settings</h1>
          <p className="text-muted-foreground">
            Your general settings will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
