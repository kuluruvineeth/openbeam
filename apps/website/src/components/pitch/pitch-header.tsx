import Link from "next/link";

interface PitchHeaderProps {
  label: string;
}

export function PitchHeader({ label }: PitchHeaderProps) {
  return (
    <div className="absolute top-4 right-0 left-0 flex items-center justify-between px-8">
      <span className="font-medium text-foreground/90 text-sm uppercase tracking-wide">
        {label}
      </span>
      <Link
        className="text-muted-foreground text-sm transition-colors hover:text-foreground/70"
        href="/"
      >
        OpenBeam
      </Link>
    </div>
  );
}
