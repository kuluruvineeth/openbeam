import type { Metadata } from "next";
import { PitchCarousel } from "@/components/pitch/pitch-carousel";

export const metadata: Metadata = {
  title: "Pitch | OpenBeam",
  description:
    "OpenBeam — Intelligence for the physical world. Seed round pitch deck.",
};

export default function Page() {
  return (
    <div className="fixed inset-0 h-screen bg-[#0A0A0A]">
      <PitchCarousel />
    </div>
  );
}
