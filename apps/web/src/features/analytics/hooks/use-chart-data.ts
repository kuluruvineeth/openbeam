"use client";

import { useMemo } from "react";
import { mergeWithDefaults } from "../lib/chart-defaults";
import { coerceNumericData } from "../lib/chart-utils";
import type { ChartConfig, ChartData, ChartType } from "../types";

type UseChartDataOptions = {
  type: ChartType;
  data: ChartData;
  config: ChartConfig;
};

export function useChartData({ type, data, config }: UseChartDataOptions) {
  const mergedConfig = useMemo(
    () => mergeWithDefaults(type, config),
    [type, config]
  );

  const processedData = useMemo(
    () => coerceNumericData(data, mergedConfig),
    [data, mergedConfig]
  );

  const isEmpty = processedData.length === 0;

  const availableFields = useMemo(() => {
    if (processedData.length === 0) {
      return [];
    }
    return Object.keys(processedData[0]);
  }, [processedData]);

  return {
    processedData,
    mergedConfig,
    isEmpty,
    availableFields,
  };
}
