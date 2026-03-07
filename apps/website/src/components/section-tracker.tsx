"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

const firedSections = new Set<string>();

interface SectionTrackerProps {
  eventName: string;
  properties?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}

export function SectionTracker({
  eventName,
  properties,
  children,
  className,
}: SectionTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || firedSections.has(eventName)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !firedSections.has(eventName)) {
          firedSections.add(eventName);
          analytics.sectionViewed(eventName, properties);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [eventName, properties]);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
