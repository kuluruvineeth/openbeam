import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ensureAccess = async () => {
  const { user } = await getAuth();

  if (!user) {
    redirect("/login");
  }

  if (
    ALLOWED_EMAILS.length > 0 &&
    !ALLOWED_EMAILS.includes(user.email?.toLowerCase() ?? "")
  ) {
    redirect("/early-access");
  }
};
