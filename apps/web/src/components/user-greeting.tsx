"use client";

import { useUserQuery } from "@/hooks/use-user";

export function UserGreeting() {
  const { data: user } = useUserQuery();

  return (
    <h1 className="mb-2 font-semibold text-lg">
      Welcome, {user?.name?.split(" ").at(0)}
    </h1>
  );
}
