"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

type CarouselWithDotsProps = {
  images: string[];
  appName: string;
};

export function CarouselWithDots({ images, appName }: CarouselWithDotsProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="relative">
      <Carousel className="w-full max-w-[465px]" setApi={setApi}>
        <CarouselContent>
          {images.map((image: string, index: number) => (
            <CarouselItem key={`${appName}-${image}-${index.toString()}`}>
              <Image
                alt={`${appName} screenshot ${index + 1}`}
                height={290}
                quality={100}
                src={image}
                width={465}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {/* Pagination dots */}
      <div className="-translate-x-1/2 absolute bottom-4 left-1/2 flex transform space-x-2">
        {images.map((image, index) => (
          <button
            aria-label={`Go to screenshot ${index + 1}`}
            className={`h-2 w-2 rounded-full transition-all ${
              index === current
                ? "bg-white shadow-lg"
                : "bg-white/50 hover:bg-white/75"
            }`}
            key={`dot-${image}-${index.toString()}`}
            onClick={() => api?.scrollTo(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
