import { redirect } from "next/navigation";

export default function IntegrationsPage() {
  // Redirect to first child route
  redirect("/integrations/all");
}
