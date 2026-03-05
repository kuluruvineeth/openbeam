import dynamic from "next/dynamic";

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
      <HeroSection />
      <Divider />
      <HowItWorksSection />
      <Divider />
      <FeaturesSection />
      <Divider />
      <SurfacesSection />
      <Divider />
      <ConnectorsSection />
      <Divider />
      <ComparisonSection />
      <Divider />
      <CTASection />
    </>
  );
}
