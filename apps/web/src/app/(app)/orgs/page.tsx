import type { Metadata } from "next";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

// Force dynamic rendering since we use headers() for authentication
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organizations | OpenPlane",
  description: "Manage your organizations",
};

export default async function Organizations() {
  const queryClient = getQueryClient();

  const user = await queryClient.fetchQuery(trpc.user.me.queryOptions());

  return (
    <HydrateClient>
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

      <div className="flex min-h-screen items-center justify-center overflow-hidden p-6 md:p-0">
        <div className="relative z-20 m-auto flex w-full max-w-[480px] flex-col">
          <div>
            <div className="text-center">
              <h1 className="mb-2 font-serif text-lg">
                Welcome, {user?.name?.split(" ").at(0)}
              </h1>
            </div>
          </div>
        </div>

        <div className="relative mt-12 w-full border-border border-t border-dashed pt-6 text-center">
          <span className="-translate-x-1/2 -top-3 absolute left-1/2 bg-background px-4 text-[#878787] text-sm">
            Or
          </span>
          <Link className="w-full" href="/orgs/create">
            <Button className="mt-2 w-full" variant="outline">
              Create organization
            </Button>
          </Link>
        </div>
      </div>
    </HydrateClient>
  );
}
