"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";

type MissionNavigationReturn = {
  hasPrevious: boolean;
  hasNext: boolean;
  goToPrevious: () => void;
  goToNext: () => void;
};

export function useMissionNavigation(
  currentMissionId: string,
  missionIds: string[]
): MissionNavigationReturn {
  const router = useRouter();

  const currentIndex = useMemo(
    () => missionIds.indexOf(currentMissionId),
    [missionIds, currentMissionId]
  );

  const previousId =
    currentIndex > 0 ? missionIds[currentIndex - 1] : undefined;
  const nextId =
    currentIndex >= 0 && currentIndex < missionIds.length - 1
      ? missionIds[currentIndex + 1]
      : undefined;

  const goToPrevious = useCallback(() => {
    if (previousId) {
      router.push(
        `/missions/${previousId}` as Parameters<typeof router.push>[0]
      );
    }
  }, [router, previousId]);

  const goToNext = useCallback(() => {
    if (nextId) {
      router.push(`/missions/${nextId}` as Parameters<typeof router.push>[0]);
    }
  }, [router, nextId]);

  useHotkeys("[", goToPrevious, { enabled: !!previousId });
  useHotkeys("]", goToNext, { enabled: !!nextId });

  return {
    hasPrevious: !!previousId,
    hasNext: !!nextId,
    goToPrevious,
    goToNext,
  };
}

export type { MissionNavigationReturn };
