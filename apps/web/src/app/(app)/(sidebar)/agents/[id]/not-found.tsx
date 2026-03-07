import { Button, Icons } from "@openbeam/ui";
import Link from "next/link";

export default function AgentNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Icons.HelpCircle className="text-muted-foreground" size={48} />
      <div className="text-center">
        <h2 className="font-semibold text-lg">Agent not found</h2>
        <p className="text-muted-foreground text-sm">
          The agent you&apos;re looking for doesn&apos;t exist or has been
          deleted.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/agents">Back to Agents</Link>
      </Button>
    </div>
  );
}
