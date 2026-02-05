import { Icons } from "@openplane/ui";

export default function Loader() {
  return (
    <div className="flex h-full items-center justify-center pt-8">
      <Icons.Loader2 className="animate-spin" />
    </div>
  );
}
