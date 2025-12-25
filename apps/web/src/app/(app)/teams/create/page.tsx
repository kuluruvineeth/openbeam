import type { Metadata } from "next";
import Link from "next/link";
import { CreateTeamForm } from "@/components/forms/create-team-form";
import { Icons } from "@/components/icons";

export const metadata: Metadata = {
  title: "Create Team | OpenPlane",
  description: "Create a new team",
};

export default function CreateTeam() {
  return (
    <>
      <header className="absolute right-0 left-0 flex w-full items-center justify-between">
        <div className="mt-4 ml-5 md:mt-10 md:ml-10">
          <Link href="/">
            <Icons.LogoSmall />
          </Link>
        </div>
      </header>

      <main className="flex min-h-screen items-center justify-center overflow-hidden p-6 md:p-0">
        <section className="relative z-20 m-auto flex w-full max-w-[400px] flex-col">
          <div className="text-center">
            <h1 className="mb-2 font-serif text-lg">Setup your team</h1>
            <p className="mb-8 text-muted-foreground text-sm">
              Add your team name.
            </p>
          </div>
          <CreateTeamForm />
        </section>
      </main>
    </>
  );
}
