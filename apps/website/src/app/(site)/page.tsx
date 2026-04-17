import dynamic from "next/dynamic";
import { SectionTracker } from "@/components/section-tracker";

const HeroSection = dynamic(() =>
  import("@/components/sections/hero-section").then((mod) => mod.HeroSection)
);
const HowItWorksSection = dynamic(() =>
  import("@/components/sections/how-it-works-section").then(
    (mod) => mod.HowItWorksSection
  )
);
const FeaturesSection = dynamic(() =>
  import("@/components/sections/features-section").then(
    (mod) => mod.FeaturesSection
  )
);
const SurfacesSection = dynamic(() =>
  import("@/components/sections/surfaces-section").then(
    (mod) => mod.SurfacesSection
  )
);
const ConnectorsSection = dynamic(() =>
  import("@/components/sections/connectors-section").then(
    (mod) => mod.ConnectorsSection
  )
);
const ComparisonSection = dynamic(() =>
  import("@/components/sections/comparison-section").then(
    (mod) => mod.ComparisonSection
  )
);
const ComputerCTASection = dynamic(() =>
  import("@/components/sections/computer-cta-section").then(
    (mod) => mod.ComputerCTASection
  )
);
const CTASection = dynamic(() =>
  import("@/components/sections/cta-section").then((mod) => mod.CTASection)
);

function Divider() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="h-px w-full border-border border-t" />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <SectionTracker eventName="hero_viewed">
        <HeroSection />
      </SectionTracker>
      <Divider />
      <SectionTracker eventName="how_it_works_viewed">
        <HowItWorksSection />
      </SectionTracker>
      <Divider />
      <SectionTracker eventName="features_viewed">
        <FeaturesSection />
      </SectionTracker>
      <Divider />
      <SurfacesSection />
      <Divider />
      <SectionTracker eventName="connectors_viewed">
        <ConnectorsSection />
      </SectionTracker>
      <Divider />
      <ComparisonSection />
      <Divider />
      <SectionTracker eventName="computer_cta_viewed">
        <ComputerCTASection />
      </SectionTracker>
      <Divider />
      <SectionTracker eventName="pricing_viewed">
        <CTASection />
      </SectionTracker>
    </>
  );
}
