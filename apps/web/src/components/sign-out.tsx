"use client";

import { DropdownMenuItem } from "@openbeam/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth/client";

export function SignOut() {
  const [isLoading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.push("/login");
  };

  return (
    <DropdownMenuItem onClick={handleSignOut}>
      {isLoading ? "Loading..." : "Sign out"}
    </DropdownMenuItem>
  );
}
