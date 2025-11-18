"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUserQuery } from "@/hooks/use-user";

/**
 * Client-side guard that redirects to /orgs/create if user has no organizationId.
 * This allows the layout to be statically rendered while still protecting routes.
 */
export function OrgGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user } = useUserQuery();

  useEffect(() => {
    if (user && !user.organizationId) {
      router.replace("/orgs/create");
    }
  }, [user, router]);

  // Don't render children until we've checked (or if redirecting)
  if (user && !user.organizationId) {
    return null;
  }

  return <>{children}</>;
}
