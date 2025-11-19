"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";

/**
 * Client-side guard that redirects to /login if unauthenticated,
 * or /orgs/create if user has no organizations.
 */
export function OrgGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: organizations, isPending: isOrgPending } =
    authClient.useListOrganizations();

  useEffect(() => {
    if (isSessionPending) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!isOrgPending && organizations && organizations.length === 0) {
      router.replace("/orgs/create");
    }
  }, [session, isSessionPending, organizations, isOrgPending, router]);

  if (isSessionPending || isOrgPending) {
    return null; // Or a loading spinner
  }

  if (!session || (organizations && organizations.length === 0)) {
    return null;
  }

  return <>{children}</>;
}
