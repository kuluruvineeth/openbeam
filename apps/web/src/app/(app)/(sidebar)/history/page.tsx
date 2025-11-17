import { redirect } from "next/navigation";

export default function HistoryPage() {
  // Redirect to first child route
  redirect("/history/favourites");
}
