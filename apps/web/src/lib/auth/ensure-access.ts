import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export const ensureAccess = async () => {
  const { user } = await getAuth();

  if (!user) {
    redirect("/login");
  }
};
