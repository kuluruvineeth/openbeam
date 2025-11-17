import { redirect } from "next/navigation";

export default function MessagesPage() {
  // Redirect to first child route
  redirect("/messages/direct");
}
