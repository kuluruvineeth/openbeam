"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// biome-ignore lint/suspicious/useAwait: This is a server action
export async function revalidateAfterTeamChange() {
  // Revalidate the layout and pages that depend on user/team data
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/teams");

  // Redirect to home after revalidating
  redirect("/");
}

// Legacy alias for backward compatibility
export async function revalidateAfterOrganizationChange() {
  return revalidateAfterTeamChange();
}
