import Image from "next/image";
import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionDemoSearch() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Product — Cross-Domain Search" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10">
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[56px]">
            Ask about a sensor. Get the full picture.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            An engineer asks why a pressure reading spiked. OpenBeam returns the
            BACnet sensor history, the Slack thread where night shift reported
            the anomaly, and the maintenance procedure from Confluence —
            synthesized into one cited answer.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-md border border-border"
          style={{
            boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5)",
          }}
        >
          <Image
            alt="OpenBeam search interface — AI Overview with grounded citations across Gmail, Google Drive, Linear, Notion, and Slack"
            className="h-auto w-full"
            height={900}
            quality={95}
            src="/hero-screenshot.png"
            width={1440}
          />
        </div>

        <div className="flex items-center justify-center gap-8 font-mono text-muted-foreground text-xs tracking-wider">
          <span>BACnet &middot; sensor history</span>
          <span>Slack &middot; maintenance threads</span>
          <span>Confluence &middot; equipment manuals</span>
          <span>Jira &middot; work orders</span>
          <span>OPC-UA &middot; telemetry</span>
        </div>
      </div>
    </section>
  );
}
