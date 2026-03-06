import Image from "next/image";
import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionTeam() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Who" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10">
        <Image
          alt="Kuluru Vineeth Kumar Reddy"
          className="rounded-md"
          height={140}
          src="/profile_photo.jpg"
          width={140}
        />

        <div className="text-center">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px]">
            Kuluru Vineeth Kumar Reddy
          </h2>
          <p className="mt-2 font-mono text-muted-foreground text-sm">
            Builder
          </p>
        </div>

        <p className="max-w-md text-center text-muted-foreground/70 text-sm leading-relaxed">
          Obsessed with building things that matter.
        </p>

        <div>
          <p className="text-center font-mono text-muted-foreground/60 text-xs uppercase tracking-widest">
            First three hires
          </p>
          <div className="flex flex-col items-center gap-1">
            <p className="text-muted-foreground/70 text-xs">
              Distributed systems engineer — edge infrastructure
            </p>
            <p className="text-muted-foreground/70 text-xs">
              Enterprise sales — manufacturing vertical
            </p>
            <p className="text-muted-foreground/70 text-xs">
              Developer advocate — open source community
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
