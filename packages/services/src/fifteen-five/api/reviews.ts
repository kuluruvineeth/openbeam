import type { FifteenFiveClient } from "../client";

export interface FifteenFiveReview {
  id: number;
  reviewer: number;
  reviewee: number;
  review_cycle: number | null;
  review_cycle_name: string | null;
  status: string | null;
  is_submitted: boolean;
  created: string;
  modified: string;
  submitted_date: string | null;
}

interface ReviewsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FifteenFiveReview[];
}

interface ListReviewsOptions {
  modifiedAfter?: string;
}

export async function* listReviews(
  client: FifteenFiveClient,
  options: ListReviewsOptions = {}
): AsyncGenerator<FifteenFiveReview[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      page_size: "100",
    };

    if (options.modifiedAfter) {
      params.modified_after = options.modifiedAfter;
    }

    const response = await client.get<ReviewsResponse>("/review/", params);

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next) {
      break;
    }
    page += 1;
  }
}
