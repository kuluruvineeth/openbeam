import type { Metadata } from "next";
import Link from "next/link";
import { ClientOnly } from "@/components/client-only";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { UserGreeting } from "@/components/user-greeting";
import { UserMenu } from "@/components/user-menu";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Teams | OpenPlane",
  description: "Manage your teams",
};

export default function Teams() {
  return (
    <HydrateClient>
      <ClientOnly>
        <header className="absolute right-0 left-0 flex w-full items-center justify-between">
          <div className="mt-4 ml-5 md:mt-10 md:ml-10">
            <Link href="/">
              <Icons.LogoSmall />
            </Link>
          </div>

          <div className="mt-4 mr-5 md:mt-10 md:mr-10">
            <UserMenu onlySignOut />
          </div>
        </header>

        <main className="flex min-h-screen items-center justify-center overflow-hidden p-6 md:p-0">
          <section className="relative z-20 m-auto flex w-full max-w-[480px] flex-col">
            <div className="text-center">
              <UserGreeting />
            </div>
          </section>

          <section className="relative mt-12 w-full border-border border-t border-dashed pt-6 text-center">
            <span
              aria-hidden="true"
              className="-translate-x-1/2 -top-3 absolute left-1/2 bg-background px-4 text-muted-foreground text-sm"
            >
              Or
            </span>
            <Link className="w-full" href="/teams/create">
              <Button className="mt-2 w-full" variant="outline">
                Create team
              </Button>
            </Link>
          </section>
        </main>
      </ClientOnly>
    </HydrateClient>
  );
}
