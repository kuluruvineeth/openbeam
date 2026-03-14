export const SOURCE_TABS = [
  { id: "all", label: "All", dataset: undefined },
  { id: "NVD", label: "CVEs", dataset: "NVD" },
  { id: "MITRE_ATTACK", label: "ATT&CK", dataset: "MITRE_ATTACK" },
  { id: "OWASP", label: "OWASP", dataset: "OWASP" },
  { id: "CISA_KEV", label: "KEV", dataset: "CISA_KEV" },
] as const;

export const SOURCE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  NVD: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
  },
  CISA_KEV: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20",
  },
  MITRE_ATTACK: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
  },
  OWASP: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
};

export const SOURCE_LABELS: Record<string, string> = {
  NVD: "CVE",
  CISA_KEV: "KEV",
  MITRE_ATTACK: "ATT&CK",
  OWASP: "OWASP",
};

export const EXPLORE_CARDS = [
  {
    query: "log4shell CVE-2021-44228",
    source: "NVD",
    id: "CVE-2021-44228",
    title: "Apache Log4j2 JNDI Remote Code Execution",
    meta: "CVSS 10.0 · Dec 2021 · Actively exploited",
  },
  {
    query: "initial access techniques",
    source: "ATT&CK",
    id: "T1190",
    title: "Exploit Public-Facing Application",
    meta: "Initial Access · Enterprise · 23 groups",
  },
  {
    query: "SQL injection prevention",
    source: "OWASP",
    id: "Cheat Sheet",
    title: "SQL Injection Prevention",
    meta: "Input validation · Parameterized queries",
  },
  {
    query: "actively exploited vulnerabilities 2026",
    source: "KEV",
    id: "CISA KEV",
    title: "Known Exploited Vulnerabilities Catalog",
    meta: "1,500+ entries · Ransomware-linked",
  },
] as const;

export const PUBLIC_API_BASE = "/api/v1/public";
