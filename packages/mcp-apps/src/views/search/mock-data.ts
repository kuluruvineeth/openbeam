export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  source?: string;
  connectorType?: string;
  documentType?: string;
  sourceName?: string;
  sourceType?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  url?: string;
  score: number;
  updatedAt: string;
}

export const MOCK_SEARCH_DATA = {
  query: "security vulnerability",
  total: 26,
  results: [
    {
      id: "1",
      title: "#engineering: Security review needed",
      snippet:
        "The authentication module needs a thorough review before the next release. Several endpoints expose user tokens in query parameters.",
      source: "SLACK",
      url: "https://slack.com/archives/C01234/p1710500000",
      score: 0.95,
      updatedAt: "2026-03-15T10:00:00Z",
    },
    {
      id: "2",
      title: "API Security Best Practices",
      snippet:
        "Follow OWASP top 10 guidelines for all public-facing APIs. Rate limiting, input validation, and JWT rotation are mandatory.",
      source: "NOTION",
      url: "https://notion.so/api-security-best-practices-abc123",
      score: 0.87,
      updatedAt: "2026-03-10T08:00:00Z",
    },
    {
      id: "3",
      title: "Fix CVE-2026-1234 in auth module",
      snippet:
        "Critical vulnerability in the session handling logic allows token replay attacks. Patch applied in v2.4.1.",
      source: "LINEAR",
      url: "https://linear.app/openbeam/issue/SEC-42",
      score: 0.82,
      updatedAt: "2026-03-20T14:00:00Z",
    },
    {
      id: "4",
      title: "Security Incident Response Runbook",
      snippet:
        "Step 1: Isolate affected services. Step 2: Rotate all credentials. Step 3: Notify security team lead within 15 minutes.",
      source: "CONFLUENCE",
      url: "https://openbeam.atlassian.net/wiki/spaces/SEC/pages/123",
      score: 0.78,
      updatedAt: "2026-02-28T16:30:00Z",
    },
    {
      id: "5",
      title: "Dependency audit: 3 high-severity findings",
      snippet:
        "npm audit found vulnerabilities in express (prototype pollution), jsonwebtoken (timing attack), and lodash (ReDoS).",
      source: "GITHUB",
      url: "https://github.com/openbeam/platform/issues/891",
      score: 0.74,
      updatedAt: "2026-03-22T09:15:00Z",
    },
  ] satisfies SearchResult[],
};
