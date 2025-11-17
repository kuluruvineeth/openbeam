import { redirect } from "next/navigation";

export default function WorkflowPage() {
  // Redirect to first child route
  redirect("/workflow/workflow");
}
