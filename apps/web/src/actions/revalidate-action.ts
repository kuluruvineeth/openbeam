"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// biome-ignore lint/suspicious/useAwait: This is a server action
export async function revalidateAfterTeamChange() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/teams");

  redirect("/");
}
