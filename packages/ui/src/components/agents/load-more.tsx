"use client";

import { forwardRef } from "react";
import { Spinner } from "../spinner";

type LoadMoreProps = {
  hasNextPage?: boolean;
};

export const LoadMore = forwardRef<HTMLDivElement, LoadMoreProps>(
  function LoadMoreInner({ hasNextPage }, ref) {
    if (!hasNextPage) {
      return null;
    }

    return (
      <div className="flex justify-center py-8" ref={ref}>
        <Spinner size={20} />
      </div>
    );
  }
);
