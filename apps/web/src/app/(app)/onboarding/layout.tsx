import Link from "next/link";
import { Icons } from "@/components/icons";

const STEPS = [
  { path: "/onboarding", label: "Welcome", step: 1 },
  { path: "/onboarding/connect", label: "Connect", step: 2 },
  { path: "/onboarding/invite", label: "Invite", step: 3 },
  { path: "/onboarding/tour", label: "Tour", step: 4 },
  { path: "/onboarding/complete", label: "Complete", step: 5 },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-border border-b px-6">
        <Link className="flex items-center gap-2" href="/">
          <Icons.LogoSmall size={24} />
          <span className="font-f37-stout">OpenPlane</span>
        </Link>
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/"
        >
          Skip for now
        </Link>
      </header>

      {/* Progress */}
      <div className="border-border border-b py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          {STEPS.map((step, index) => (
            <div className="flex items-center" key={step.path}>
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center bg-muted text-muted-foreground text-sm">
                  {step.step}
                </div>
                <span className="mt-1 text-muted-foreground text-xs">
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="mx-2 h-px w-12 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
