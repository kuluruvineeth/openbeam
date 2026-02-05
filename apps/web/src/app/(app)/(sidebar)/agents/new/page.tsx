import { redirect } from "next/navigation";

export default function AgentsNewPage() {
  redirect("/agents?agent=new&step=1");
}
