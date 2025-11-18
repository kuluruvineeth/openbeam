"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// biome-ignore lint/suspicious/useAwait: This is a server action
export async function revalidateAfterOrganizationChange() {
  // Revalidate the layout and pages that depend on user/organization data
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/orgs");

  // Redirect to home after revalidating
  redirect("/");
}
