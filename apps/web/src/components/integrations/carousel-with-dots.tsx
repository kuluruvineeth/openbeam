"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@openbeam/ui";
import Image from "next/image";
import { useEffect, useState } from "react";

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
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  return (
    <div className="relative">
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent>
          {images.map((image: string, index: number) => (
            <CarouselItem key={`${appName}-${image}-${index.toString()}`}>
              <Image
                alt={`${appName} screenshot ${index + 1}`}
                className="w-full"
                height={290}
                quality={100}
                src={image}
                width={465}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {images.length > 1 && (
        <div className="-translate-x-1/2 absolute bottom-3 left-1/2 flex gap-1.5">
          {images.map((image, index) => (
            <button
              aria-label={`Go to screenshot ${index + 1}`}
              className={`h-1.5 w-1.5 transition-all ${
                index === current
                  ? "w-4 bg-white"
                  : "bg-white/40 hover:bg-white/60"
              }`}
              key={`dot-${image}-${index.toString()}`}
              onClick={() => api?.scrollTo(index)}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}
