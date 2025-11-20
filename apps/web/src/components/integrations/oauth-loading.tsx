import { Icons } from "@/components/icons";

interface OAuthLoadingProps {
  state: "connecting" | "processing" | "success" | "error";
  integration?: string;
  message?: string;
}

export function OAuthLoading({
  state,
  integration = "service",
  message,
}: OAuthLoadingProps) {
  if (state === "success") {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-8">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-openplane-green/10" />
          <div className="relative flex size-20 items-center justify-center rounded-full border border-openplane-green/20 bg-background-100">
            <Icons.CheckIcon className="text-openplane-green" size={36} />
          </div>
        </div>
        <div className="space-y-3 text-center">
          <h3 className="font-medium text-foreground text-lg tracking-tight">
            Connected
          </h3>
          <p className="max-w-xs text-muted-foreground text-sm">
            {message || `Successfully connected to ${integration}`}
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-8">
        <div className="flex size-20 items-center justify-center rounded-full border border-destructive/20 bg-background-100">
          <Icons.XIcon className="text-destructive" size={36} />
        </div>
        <div className="space-y-3 text-center">
          <h3 className="font-medium text-foreground text-lg tracking-tight">
            Connection Failed
          </h3>
          <p className="max-w-xs text-muted-foreground text-sm">
            {message || "Unable to complete the connection"}
          </p>
        </div>
      </div>
    );
  }

  const displayMessage =
    state === "connecting"
      ? `Connecting to ${integration}...`
      : "Completing authentication...";

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-8">
      <div className="relative size-20">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-background-300" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary duration-1500" />
        <div className="flex size-full items-center justify-center">
          <Icons.Integrations className="text-muted-foreground" size={28} />
        </div>
      </div>
      <div className="space-y-3 text-center">
        <h3 className="font-medium text-foreground text-lg tracking-tight">
          {displayMessage}
        </h3>
        {message && (
          <p className="max-w-xs text-muted-foreground text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
