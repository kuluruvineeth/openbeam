import posthog from "posthog-js";

function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }
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

  docsLinkClicked: (from: string) => capture("docs_link_clicked", { from }),

  githubLinkClicked: (from: string) => capture("github_link_clicked", { from }),

  bookMeetingClicked: (from: string) =>
    capture("book_meeting_clicked", { from }),

  comparisonViewed: (competitor: string) =>
    capture("comparison_viewed", { competitor }),

  docsClicked: (from: string, destination: string) =>
    capture("docs_clicked", { from, destination }),

  connectorExplored: (connectorCount: number, connectors: string[]) =>
    capture("connector_explored", {
      connector_count: connectorCount,
      connectors,
    }),

  sectionViewed: (section: string, properties?: Record<string, unknown>) =>
    capture("section_viewed", { section, ...properties }),

  selfHostDocsClicked: (from: string) =>
    capture("self_host_docs_clicked", { from }),

  enterpriseInterest: (from: string) =>
    capture("enterprise_interest", { from }),

  shareClicked: (content: string, method: string) =>
    capture("share_clicked", { content, method }),

  changelogViewed: () => capture("changelog_viewed"),

  changelogEntryViewed: (version: string, title: string) =>
    capture("changelog_entry_viewed", { version, title }),

  changelogVideoPlayed: (version: string) =>
    capture("changelog_video_played", { version }),

  changelogShareClicked: (version: string) =>
    capture("changelog_share_clicked", { version }),

  changelogRssSubscribed: () => capture("changelog_rss_subscribed"),

  captureUtm: (params: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    referrer?: string;
  }) => {
    if (typeof window === "undefined") {
      return;
    }

    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v)
    );

    if (Object.keys(filtered).length === 0) {
      return;
    }

    posthog.register(filtered);
    posthog.setPersonPropertiesForFlags(filtered);
    capture("utm_captured", filtered);
  },
};
