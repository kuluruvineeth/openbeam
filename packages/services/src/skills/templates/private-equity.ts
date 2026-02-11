import type { MissionTemplate } from "@openplane/types/mission-control";

export const privateEquityTemplates: MissionTemplate[] = [
  {
    id: "pe-deal-triage",
    name: "Deal Flow Triage",
    description: "Screen, score, and route incoming deal opportunities",
    vertical: "private-equity",
    agents: [
      {
        name: "deal-screener",
        role: "Initial screening of deal opportunities",
        soulPrompt:
          "<role>You are a deal flow screener. Evaluate incoming opportunities against investment criteria, market size, and team quality.</role>",
        tools: ["search_web", "scrape_page", "search_hybrid"],
      },
      {
        name: "market-analyst",
        role: "Analyzes market dynamics and competitive landscape",
        soulPrompt:
          "<role>You are a market analyst. Research industry trends, competitive dynamics, and market sizing for potential investments.</role>",
        tools: ["search_web", "scrape_page"],
      },
    ],
    tasks: [
      {
        title: "Screen deal against criteria",
        description: "Evaluate fit with fund investment thesis",
        priority: "P1",
      },
      {
        title: "Analyze market opportunity",
        description: "Research TAM, competition, and trends",
        priority: "P1",
      },
      {
        title: "Score and recommend",
        description: "Generate investment score and recommendation",
        priority: "P2",
      },
    ],
    complianceProfile: "regulated-finance",
  },
  {
    id: "pe-diligence-checklist",
    name: "Diligence Checklist Automation",
    description: "Generate and track due diligence checklist items",
    vertical: "private-equity",
    agents: [
      {
        name: "diligence-coordinator",
        role: "Manages the diligence process and checklist",
        soulPrompt:
          "<role>You are a due diligence coordinator. Generate comprehensive diligence checklists, track completion, and flag critical findings.</role>",
        tools: ["search_hybrid", "doc_get", "doc_chunks"],
      },
    ],
    tasks: [
      {
        title: "Generate diligence checklist",
        description: "Create comprehensive checklist by category",
        priority: "P0",
      },
      {
        title: "Track completion",
        description: "Monitor progress on each checklist item",
        priority: "P1",
      },
      {
        title: "Compile findings report",
        description: "Aggregate findings into summary report",
        priority: "P2",
      },
    ],
    complianceProfile: "regulated-finance",
  },
];
