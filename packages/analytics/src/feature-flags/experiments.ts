import { getBrowserClient } from "../clients/browser";

export interface ExperimentExposureEvent {
  experimentId: string;
  variant: string;
  exposureContext: string;
}

export interface ExperimentConversionEvent {
  experimentId: string;
  variant: string;
  conversionType: string;
  conversionValue?: number;
  metadata?: Record<string, unknown>;
}

export const experiments = {
  getVariant: <T extends string>(
    experimentFlag: string,
    variants: readonly T[]
  ): T | undefined => {
    const client = getBrowserClient();
    const value = client.getFeatureFlag(experimentFlag);
    if (value === undefined) {
      return;
    }
    return variants.includes(value as T) ? (value as T) : undefined;
  },

  trackExposure: (event: ExperimentExposureEvent) => {
    getBrowserClient().capture("$feature_flag_called", {
      $feature_flag: event.experimentId,
      $feature_flag_response: event.variant,
      exposure_context: event.exposureContext,
    });
  },

  trackConversion: (event: ExperimentConversionEvent) => {
    getBrowserClient().capture("experiment_conversion", {
      experiment_id: event.experimentId,
      variant: event.variant,
      conversion_type: event.conversionType,
      conversion_value: event.conversionValue,
      ...event.metadata,
    });
  },

  isInVariant: (experimentFlag: string, variant: string): boolean => {
    const client = getBrowserClient();
    return client.getFeatureFlag(experimentFlag) === variant;
  },

  getPayload: <T>(experimentFlag: string): T | undefined => {
    const client = getBrowserClient();
    return client.getFeatureFlagPayload(experimentFlag) as T | undefined;
  },
};

export function createExperiment<T extends string>(
  experimentId: string,
  variants: readonly T[]
): {
  getVariant: () => T | undefined;
  isInVariant: (variant: T) => boolean;
  trackExposure: (context: string) => void;
  trackConversion: (conversionType: string, value?: number) => void;
} {
  return {
    getVariant: () => experiments.getVariant(experimentId, variants),
    isInVariant: (variant: T) => experiments.isInVariant(experimentId, variant),
    trackExposure: (context: string) => {
      const variant = experiments.getVariant(experimentId, variants);
      if (variant) {
        experiments.trackExposure({
          experimentId,
          variant,
          exposureContext: context,
        });
      }
    },
    trackConversion: (conversionType: string, value?: number) => {
      const variant = experiments.getVariant(experimentId, variants);
      if (variant) {
        experiments.trackConversion({
          experimentId,
          variant,
          conversionType,
          conversionValue: value,
        });
      }
    },
  };
}
