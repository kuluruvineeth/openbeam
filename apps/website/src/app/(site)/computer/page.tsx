import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { SectionTracker } from "@/components/section-tracker";

const ComputerHero = dynamic(() =>
  import("@/components/sections/computer/hero").then((mod) => mod.ComputerHero)
);
const ComputerFeatures = dynamic(() =>
  import("@/components/sections/computer/features").then(
    (mod) => mod.ComputerFeatures
  )
);
const ComputerCatalog = dynamic(() =>
  import("@/components/sections/computer/catalog").then(
    (mod) => mod.ComputerCatalog
  )
);
const ComputerHowItWorks = dynamic(() =>
  import("@/components/sections/computer/how-it-works").then(
    (mod) => mod.ComputerHowItWorks
  )
);
const ComputerSurfaces = dynamic(() =>
  import("@/components/sections/computer/surfaces").then(
    (mod) => mod.ComputerSurfaces
  )
);
const ComputerCTA = dynamic(() =>
  import("@/components/sections/computer/cta").then((mod) => mod.ComputerCTA)
);

export const metadata: Metadata = {
  title: "Computer — Autonomous AI Agents | OpenBeam",
  description:
    "Deploy autonomous agents that monitor your knowledge base, track connector health, surface compliance issues, and deliver insights on schedule.",
  openGraph: {
    title: "OpenBeam Computer",
    description: "Your agents work even when you don't.",
    url: "https://openbeam.work/computer/",
  },
  twitter: {
    title: "OpenBeam Computer",
    description:
      "Autonomous AI agents for enterprise search. Monitor, analyze, and act — on schedule.",
  },
  alternates: {
    canonical: "https://openbeam.work/computer/",
  },
};

function StripeDivider() {
  return (
    <div
      className="h-4 w-full border-border border-y"
      style={{
        backgroundImage:
          "repeating-linear-gradient(-60deg, hsla(var(--border), 0.4), hsla(var(--border), 0.4) 1px, transparent 1px, transparent 6px)",
      }}
    />
  );
}

function Divider() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="h-px w-full border-border border-t" />
    </div>
  );
}

export default function ComputerPage() {
  return (
    <>
      <SectionTracker eventName="computer_hero_viewed">
        <ComputerHero />
      </SectionTracker>
      <StripeDivider />
      <SectionTracker eventName="computer_features_viewed">
        <ComputerFeatures />
      </SectionTracker>
      <StripeDivider />
      <SectionTracker eventName="computer_catalog_viewed">
        <ComputerCatalog />
      </SectionTracker>
      <Divider />
      <SectionTracker eventName="computer_how_it_works_viewed">
        <ComputerHowItWorks />
      </SectionTracker>
      <Divider />
      <SectionTracker eventName="computer_surfaces_viewed">
        <ComputerSurfaces />
      </SectionTracker>
      <StripeDivider />
      <SectionTracker eventName="computer_cta_viewed">
        <ComputerCTA />
      </SectionTracker>
    </>
  );
}
