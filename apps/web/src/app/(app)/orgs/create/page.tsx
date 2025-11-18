import type { Metadata } from "next";
import Link from "next/link";
import { CreateOrgForm } from "@/components/forms/create-org-form";
import { Icons } from "@/components/icons";

export const metadata: Metadata = {
  title: "Create Organization | OpenPlane",
  description: "Create a new organization",
};

export default function CreateOrganization() {
  return (
    <>
      <header className="absolute right-0 left-0 flex w-full items-center justify-between">
        <div className="mt-4 ml-5 md:mt-10 md:ml-10">
          <Link href="/">
            <Icons.LogoSmall />
          </Link>
        </div>
      </header>

      <div className="flex min-h-screen items-center justify-center overflow-hidden p-6 md:p-0">
        <div className="relative z-20 m-auto flex w-full max-w-[400px] flex-col">
          <div className="text-center">
            <h1 className="mb-2 font-serif text-lg">Setup your organization</h1>
            <p className="mb-8 text-[#878787] text-sm">
              Add your organization name.
            </p>
          </div>
          <CreateOrgForm />
        </div>
      </div>
    </>
  );
}
