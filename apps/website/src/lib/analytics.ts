import posthog from "posthog-js";

function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export const analytics = {
  ctaClicked: (cta: string, location: string) =>
    capture("cta_clicked", { cta, location }),

  pitchSlideViewed: (slide: number, title: string) =>
    capture("pitch_slide_viewed", { slide, title }),

  pitchDeckCompleted: (totalSlides: number) =>
    capture("pitch_deck_completed", { total_slides: totalSlides }),

  memoViewed: () => capture("investor_memo_viewed"),

  memoDownloaded: () => capture("investor_memo_downloaded"),

  connectorPageViewed: (connector: string) =>
    capture("connector_page_viewed", { connector }),

  connectorCategoryViewed: (category: string) =>
    capture("connector_category_viewed", { category }),

  pricingViewed: (plan?: string) => capture("pricing_viewed", { plan }),

  docsLinkClicked: (from: string) =>
    capture("docs_link_clicked", { from }),

  githubLinkClicked: (from: string) =>
    capture("github_link_clicked", { from }),

  bookMeetingClicked: (from: string) =>
    capture("book_meeting_clicked", { from }),

  comparisonViewed: (competitor: string) =>
    capture("comparison_viewed", { competitor }),
};
