"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
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

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
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
