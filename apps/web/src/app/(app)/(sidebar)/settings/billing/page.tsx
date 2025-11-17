import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Billing | OpenPlane",
  description: "Manage your billing and subscription",
};

export default function BillingPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Billing</h1>
          <p className="text-muted-foreground">
            Your billing information will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
