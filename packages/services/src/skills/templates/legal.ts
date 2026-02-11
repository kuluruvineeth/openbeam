import type { MissionTemplate } from "@openplane/types/mission-control";

export const legalTemplates: MissionTemplate[] = [
  {
    id: "legal-matter-intake",
    name: "Matter Intake Triage",
    description: "Classify, route, and prioritize incoming legal matters",
    vertical: "legal",
    agents: [
      {
        name: "intake-classifier",
        role: "Classifies incoming matters by type, urgency, and practice area",
        soulPrompt: `<role>You are a legal intake classifier. Analyze incoming matters and classify them by practice area, urgency level, and required expertise.</role>
<workflow>
1. Read the matter description
2. Classify by practice area (litigation, corporate, IP, employment, etc.)
3. Assess urgency (P0: immediate, P1: this week, P2: this month, P3: when possible)
4. Identify required expertise and potential conflicts
5. Route to appropriate team or attorney
</workflow>`,
        tools: ["search_hybrid", "doc_get"],
      },
      {
        name: "conflict-checker",
        role: "Checks for conflicts of interest across existing matters",
        soulPrompt: `<role>You are a conflicts checker. Search existing matters and client records to identify potential conflicts of interest.</role>
<workflow>
1. Extract party names and related entities from the new matter
2. Search existing matters for matching parties
3. Check for adverse party relationships
4. Flag any potential conflicts with confidence level
</workflow>`,
        tools: ["search_hybrid", "search_semantic"],
      },
    ],
    tasks: [
      {
        title: "Classify matter type and practice area",
        description: "Determine the practice area and matter type",
        priority: "P1",
      },
      {
        title: "Run conflicts check",
        description: "Check for conflicts of interest",
        priority: "P0",
      },
      {
        title: "Assess urgency and route",
        description: "Determine urgency and assign to appropriate team",
        priority: "P1",
      },
    ],
    complianceProfile: "regulated-legal",
  },
  {
    id: "legal-contract-review",
    name: "Contract Clause Analysis",
    description: "Highlight key clauses, flag risks, and summarize contracts",
    vertical: "legal",
    agents: [
      {
        name: "clause-analyst",
        role: "Identifies and categorizes contract clauses",
        soulPrompt:
          "<role>You are a contract clause analyst. Read contracts and identify key clauses, unusual terms, and potential risks.</role>",
        tools: ["doc_get", "doc_chunks", "search_semantic"],
      },
    ],
    tasks: [
      {
        title: "Extract and categorize key clauses",
        description: "Identify all material clauses",
        priority: "P1",
      },
      {
        title: "Flag risk areas",
        description: "Highlight unusual or risky terms",
        priority: "P0",
      },
      {
        title: "Generate summary",
        description: "Produce executive summary of the contract",
        priority: "P2",
      },
    ],
    complianceProfile: "regulated-legal",
  },
];
