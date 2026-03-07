"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import { CarouselToolbar } from "./carousel-toolbar";
import { SectionBusiness } from "./sections/section-business";
import { SectionClose } from "./sections/section-close";
import { SectionCompetition } from "./sections/section-competition";
import { SectionDemoAgents } from "./sections/section-demo-agents";
import { SectionDemoPhysical } from "./sections/section-demo-physical";
import { SectionDemoSearch } from "./sections/section-demo-search";
import { SectionFinancials } from "./sections/section-financials";
import { SectionGtm } from "./sections/section-gtm";
import { SectionMarket } from "./sections/section-market";
import { SectionMoat } from "./sections/section-moat";
import { SectionProblem } from "./sections/section-problem";
import { SectionSolution } from "./sections/section-solution";
import { SectionTeam } from "./sections/section-team";
import { SectionTitle } from "./sections/section-title";
import { SectionVision } from "./sections/section-vision";
import { SectionWhyNow } from "./sections/section-why-now";

const SLIDES = [
  SectionTitle,
  SectionProblem,
  SectionWhyNow,
  SectionSolution,
  SectionDemoSearch,
  SectionDemoPhysical,
  SectionDemoAgents,
  SectionMoat,
  SectionMarket,
  SectionCompetition,
  SectionBusiness,
  SectionGtm,
  SectionFinancials,
  SectionVision,
  SectionTeam,
  SectionClose,
] as const;

const SLIDE_NAMES = [
  "Title",
  "Problem",
  "Why Now",
  "Solution",
  "Demo: Search",
  "Demo: Physical AI",
  "Demo: Agents",
  "Moat",
  "Market",
  "Competition",
  "Business Model",
  "Go-to-Market",
  "Financials",
  "Vision",
  "Team",
  "Close",
];

export function PitchCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "x",
    loop: false,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const viewedSlides = useRef(new Set<number>());

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());

    if (!viewedSlides.current.has(index)) {
      viewedSlides.current.add(index);
      analytics.pitchSlideViewed(index + 1, SLIDE_NAMES[index] ?? "Unknown");
      if (index === SLIDES.length - 1) {
        analytics.pitchDeckCompleted(SLIDES.length);
      }
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative h-full">
      <div className="h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {SLIDES.map((Slide, index) => (
            <div
              className="relative h-full min-w-0 shrink-0 grow-0 basis-full overflow-y-auto overflow-x-clip"
              key={index}
            >
              <Slide />
            </div>
          ))}
        </div>
      </div>

      <CarouselToolbar
        canScrollNext={canScrollNext}
        canScrollPrev={canScrollPrev}
        current={selectedIndex + 1}
        onNext={scrollNext}
        onPrev={scrollPrev}
        total={SLIDES.length}
      />
    </div>
  );
}
