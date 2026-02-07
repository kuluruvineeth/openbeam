import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type PollingCondition<TData> = (data: TData | undefined) => boolean;

export function usePollingQuery<TData>(
  options: UseQueryOptions<TData> & {
    pollingInterval?: number | ((data: TData | undefined) => number | false);
    pollingCondition?: PollingCondition<TData>;
  }
) {
  const { pollingInterval, pollingCondition, ...queryOptions } = options;

  const refetchInterval = useMemo(() => {
    if (typeof pollingInterval === "function") {
      return (query: { state: { data?: TData } }) => {
        const data = query.state.data;
        if (pollingCondition && !pollingCondition(data)) {
          return false;
        }
        return pollingInterval(data);
      };
    }

    if (typeof pollingInterval === "number" && pollingCondition) {
      return (query: { state: { data?: TData } }) =>
        pollingCondition(query.state.data) ? pollingInterval : false;
    }

    return pollingInterval;
  }, [pollingInterval, pollingCondition]);

  return useQuery({
    ...queryOptions,
    refetchInterval,
  });
}
