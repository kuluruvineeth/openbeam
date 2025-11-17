import { redirect } from "next/navigation";

export default function AgentsPage() {
  // Redirect to first child route
  redirect("/agents/all");
}
