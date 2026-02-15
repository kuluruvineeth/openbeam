"use client";

import type { MissionTemplate } from "@openplane/types/mission-control";
import { Button, Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: "essay-writer",
    name: "Essay Writer",
    description:
      "Write a well-structured essay on a given topic using a single research-and-write agent",
    defaultObjective:
      "Write a well-structured essay on how Elon Musk's approach to startups — from PayPal to SpaceX to Tesla — redefined what it means to build at scale. Cover his risk tolerance, first-principles thinking, and vertical integration strategy.",
    vertical: "content",
    agents: [
      {
        name: "Essay Writer",
        role: "coordinator",
        soulPrompt:
          "You write clear, well-structured essays. Research the topic using available tools, outline key arguments, and produce a polished essay with an introduction, body paragraphs, and conclusion.",
        tools: [
          "search_hybrid",
          "rag_answer",
          "mission_write_memory",
          "mission_create_artifact",
        ],
        capabilities: ["research", "synthesis", "writing"],
      },
    ],
    tasks: [
      {
        title: "Research topic",
        description:
          "Gather key facts, data, and perspectives on Elon Musk's startup methodology and scaling approach",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Write essay",
        description:
          "Produce a polished essay covering Musk's risk tolerance, first-principles thinking, and vertical integration with introduction, arguments, and conclusion",
        priority: "P1",
        dependsOn: ["0"],
        requiredCapabilities: ["synthesis"],
      },
    ],
  },
  {
    id: "weekly-digest",
    name: "Weekly Team Digest",
    description:
      "Summarize Slack conversations, Linear issues, and Notion updates into a weekly team digest",
    vertical: "engineering",
    agents: [
      {
        name: "Activity Collector",
        role: "specialist",
        soulPrompt:
          "You gather and organize team activity across Slack, Linear, and Notion. Focus on meaningful updates, shipped features, and open blockers rather than noise.",
        tools: [
          "search_hybrid",
          "doc_get",
          "connector_list",
          "mission_write_memory",
        ],
      },
      {
        name: "Digest Writer",
        role: "coordinator",
        soulPrompt:
          "You synthesize raw activity data into concise, scannable weekly digests. Prioritize clarity and actionability over completeness.",
        tools: ["rag_answer", "mission_read_memory", "mission_create_artifact"],
      },
    ],
    tasks: [
      {
        title: "Collect activity data",
        description:
          "Pull Slack threads, Linear updates, and Notion changes from the past 7 days",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Identify key themes",
        description:
          "Group activity into themes: shipped work, active discussions, blockers, and decisions",
        priority: "P1",
        dependsOn: ["0"],
        requiredCapabilities: ["research"],
      },
      {
        title: "Produce digest artifact",
        description:
          "Write a structured digest document with sections for highlights, blockers, and next week focus",
        priority: "P1",
        dependsOn: ["1"],
        requiredCapabilities: ["synthesis"],
      },
    ],
  },
  {
    id: "compliance-audit",
    name: "Compliance Audit",
    description:
      "Scan connected sources for policy violations, data exposure risks, and compliance gaps",
    vertical: "compliance",
    agents: [
      {
        name: "Policy Scanner",
        role: "specialist",
        soulPrompt:
          "You scan documents and messages for potential policy violations including data handling, access control, and retention issues. Flag findings with severity levels.",
        tools: [
          "search_hybrid",
          "search_semantic",
          "doc_chunks",
          "mission_write_memory",
        ],
      },
      {
        name: "Risk Assessor",
        role: "reviewer",
        soulPrompt:
          "You evaluate flagged findings for actual risk severity, filter false positives, and categorize issues by compliance framework (SOC2, GDPR, HIPAA).",
        tools: ["rag_verify", "mission_read_memory", "mission_create_artifact"],
      },
    ],
    tasks: [
      {
        title: "Scan connected sources",
        description:
          "Search across all connected data sources for policy violation patterns and sensitive data exposure",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Assess risk severity",
        description:
          "Evaluate each finding for actual risk, filter false positives, and assign severity ratings",
        priority: "P1",
        dependsOn: ["0"],
        requiredCapabilities: ["review"],
      },
      {
        title: "Generate audit report",
        description:
          "Produce a compliance audit report with findings, risk levels, and recommended remediations",
        priority: "P1",
        dependsOn: ["1"],
        requiredCapabilities: ["synthesis"],
      },
    ],
    complianceProfile: "soc2",
  },
  {
    id: "competitor-research",
    name: "Competitor Intelligence",
    description:
      "Monitor and analyze competitor activity across public sources and internal knowledge",
    vertical: "strategy",
    agents: [
      {
        name: "Intelligence Gatherer",
        role: "specialist",
        soulPrompt:
          "You systematically collect competitor signals from connected sources including product launches, pricing changes, hiring patterns, and public communications.",
        tools: [
          "search_hybrid",
          "search_semantic",
          "doc_get",
          "mission_write_memory",
        ],
      },
      {
        name: "Strategy Analyst",
        role: "coordinator",
        soulPrompt:
          "You synthesize competitive intelligence into strategic insights. Identify patterns, assess threats and opportunities, and produce actionable recommendations for leadership.",
        tools: ["rag_answer", "mission_read_memory", "mission_create_artifact"],
      },
    ],
    tasks: [
      {
        title: "Gather competitor signals",
        description:
          "Collect recent competitor activity across product updates, hiring, partnerships, and market positioning",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Analyze competitive landscape",
        description:
          "Compare competitor moves against our roadmap and identify strategic implications",
        priority: "P1",
        dependsOn: ["0"],
        requiredCapabilities: ["analysis"],
      },
      {
        title: "Produce intelligence brief",
        description:
          "Create a concise competitive intelligence brief with threats, opportunities, and recommended actions",
        priority: "P1",
        dependsOn: ["1"],
        requiredCapabilities: ["synthesis"],
      },
    ],
  },
  {
    id: "research",
    name: "Research Report",
    description:
      "Research a topic across all connected sources and produce a cited, comprehensive report",
    vertical: "research",
    agents: [
      {
        name: "Research Lead",
        role: "coordinator",
        soulPrompt:
          "You orchestrate deep research across enterprise data sources. Decompose complex questions into targeted searches and synthesize findings into structured reports with citations.",
        tools: [
          "search_hybrid",
          "doc_get",
          "rag_answer",
          "mission_write_memory",
          "mission_create_artifact",
        ],
      },
      {
        name: "Fact Checker",
        role: "reviewer",
        soulPrompt:
          "You verify every factual claim against primary sources. Flag unsupported assertions, check for contradictions, and ensure citation accuracy.",
        tools: [
          "rag_verify",
          "search_semantic",
          "doc_chunks",
          "mission_read_memory",
        ],
      },
    ],
    tasks: [
      {
        title: "Gather sources",
        description:
          "Search connected sources for relevant documents, data, and prior research on the topic",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Synthesize findings",
        description:
          "Organize evidence into a structured report with clear sections, conclusions, and citations",
        priority: "P1",
        dependsOn: ["0"],
        requiredCapabilities: ["synthesis"],
      },
      {
        title: "Fact-check claims",
        description:
          "Verify all factual statements against source documents and flag unsupported assertions",
        priority: "P1",
        dependsOn: ["1"],
        requiredCapabilities: ["review"],
      },
    ],
  },
  {
    id: "content",
    name: "Content Creation",
    description:
      "Research, draft, and refine polished content with built-in editorial review",
    vertical: "content",
    agents: [
      {
        name: "Content Writer",
        role: "specialist",
        soulPrompt:
          "You produce clear, engaging content grounded in research. Match the target audience tone, support claims with evidence, and structure for readability.",
        tools: [
          "search_hybrid",
          "rag_answer",
          "mission_read_memory",
          "mission_create_artifact",
        ],
        capabilities: ["research", "writing"],
      },
      {
        name: "Editor",
        role: "reviewer",
        soulPrompt:
          "You review content for clarity, accuracy, tone consistency, and structural flow. Tighten prose, cut redundancy, and ensure the piece achieves its stated goal.",
        tools: ["doc_get", "mission_read_memory", "mission_write_memory"],
      },
    ],
    tasks: [
      {
        title: "Research topic",
        description:
          "Gather background information, key data points, and relevant examples from connected sources",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Write draft",
        description:
          "Produce an initial content draft with clear structure, supporting evidence, and appropriate tone",
        priority: "P1",
        dependsOn: ["0"],
        requiredCapabilities: ["writing"],
      },
      {
        title: "Review and polish",
        description:
          "Edit for clarity, accuracy, and flow. Tighten language and ensure consistency throughout",
        priority: "P1",
        dependsOn: ["1"],
        requiredCapabilities: ["review"],
      },
    ],
  },
  {
    id: "market-analysis",
    name: "Market Analysis",
    description:
      "Four-agent squad researches market, competitors, and customers in parallel, then synthesizes a strategic brief",
    defaultObjective:
      "Analyze the AI code editor market — map the competitive landscape including Cursor, GitHub Copilot, Windsurf, and Bolt, identify key customer segments and their unmet needs, estimate the total addressable market, and produce a strategic brief with positioning recommendations for a new entrant.",
    vertical: "strategy",
    agents: [
      {
        name: "Market Researcher",
        role: "specialist",
        soulPrompt:
          "You research market size, growth trends, and macro dynamics. Quantify the total addressable market, identify growth drivers and headwinds, and surface recent funding or M&A signals. Write findings to shared memory so the Strategy Synthesizer can reference them.",
        tools: ["search_hybrid", "search_semantic", "mission_write_memory"],
      },
      {
        name: "Competitive Analyst",
        role: "specialist",
        soulPrompt:
          "You map the competitive landscape. For each major player, document their positioning, pricing model, key features, distribution strategy, and recent moves. Identify gaps and white space. Write findings to shared memory so the Strategy Synthesizer can reference them.",
        tools: ["search_hybrid", "doc_get", "mission_write_memory"],
      },
      {
        name: "Customer Analyst",
        role: "specialist",
        soulPrompt:
          "You identify and characterize customer segments. Document each segment's needs, pain points, willingness to pay, and current alternatives. Highlight underserved segments. Write findings to shared memory so the Strategy Synthesizer can reference them.",
        tools: ["search_hybrid", "search_semantic", "mission_write_memory"],
      },
      {
        name: "Strategy Synthesizer",
        role: "coordinator",
        soulPrompt:
          "You read all findings from shared memory — market data, competitive landscape, and customer segments — and synthesize them into a single strategic brief. Include an executive summary, key insights from each research stream, strategic recommendations, and risks. Produce the final artifact.",
        tools: ["rag_answer", "mission_read_memory", "mission_create_artifact"],
      },
    ],
    tasks: [
      {
        title: "Research market landscape",
        description:
          "Quantify the total addressable market, map growth trends and drivers, and surface recent funding and M&A activity",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Analyze competitor positioning",
        description:
          "Map each major competitor's positioning, pricing, features, distribution, and recent moves — identify gaps and white space",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Map customer segments",
        description:
          "Identify key customer segments, document their needs and pain points, and highlight underserved groups",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Synthesize strategic brief",
        description:
          "Read all research findings from shared memory and produce a strategic brief with executive summary, key insights, positioning recommendations, and risk factors",
        priority: "P1",
        dependsOn: ["0", "1", "2"],
        requiredCapabilities: ["coordination", "synthesis"],
      },
    ],
  },
  {
    id: "rfp-response",
    name: "Enterprise RFP Response",
    description:
      "Six-agent squad that parses RFP requirements, matches company capabilities, checks compliance, drafts responses, reviews quality, and produces a submission-ready document",
    defaultObjective:
      "Respond to the enterprise software RFP from Acme Corporation. Parse all requirements sections, match our platform capabilities to each requirement, verify compliance with their security and data handling standards (SOC 2 Type II, GDPR, HIPAA), develop competitive pricing, draft detailed responses for each section, and produce a polished, submission-ready RFP response document.",
    vertical: "operations",
    agents: [
      {
        name: "Requirements Analyst",
        role: "specialist",
        soulPrompt:
          "You parse and decompose RFP documents into structured requirements. Extract mandatory vs optional requirements, identify evaluation criteria and weightings, flag ambiguous language, and organize requirements by section. Write structured findings to shared memory for downstream agents.",
        tools: [
          "search_hybrid",
          "doc_get",
          "doc_chunks",
          "mission_write_memory",
        ],
        capabilities: ["research", "analysis"],
      },
      {
        name: "Capability Matcher",
        role: "specialist",
        soulPrompt:
          "You match company capabilities to RFP requirements. For each requirement, find relevant product documentation, case studies, and technical specifications that demonstrate compliance. Identify gaps where capabilities fall short and suggest mitigation strategies. Write match assessments to shared memory.",
        tools: [
          "search_hybrid",
          "search_semantic",
          "doc_get",
          "mission_write_memory",
        ],
        capabilities: ["research", "analysis"],
      },
      {
        name: "Compliance Reviewer",
        role: "specialist",
        soulPrompt:
          "You review RFP compliance and legal requirements. Verify that proposed responses meet security standards (SOC 2 Type II, GDPR, HIPAA), data handling requirements, SLA commitments, and contractual terms. Flag risks and non-compliant areas. Write compliance assessments to shared memory.",
        tools: [
          "search_hybrid",
          "doc_chunks",
          "rag_verify",
          "mission_write_memory",
        ],
        capabilities: ["research", "review"],
      },
      {
        name: "Response Drafter",
        role: "specialist",
        soulPrompt:
          "You draft polished RFP response sections. Read capability matches and compliance assessments from shared memory, then write clear, persuasive responses for each requirement section. Use concrete evidence, metrics, and case studies. Produce response sections as artifacts.",
        tools: [
          "rag_answer",
          "mission_read_memory",
          "mission_write_memory",
          "mission_create_artifact",
        ],
        capabilities: ["writing", "synthesis"],
      },
      {
        name: "Pricing Analyst",
        role: "specialist",
        soulPrompt:
          "You analyze pricing and commercial terms in the RFP. Review pricing requirements, identify volume tiers and discount structures, assess competitor pricing benchmarks, and develop a competitive pricing proposal. Write pricing analysis to shared memory.",
        tools: ["search_hybrid", "doc_get", "mission_write_memory"],
        capabilities: ["research", "analysis"],
      },
      {
        name: "Submission Lead",
        role: "coordinator",
        soulPrompt:
          "You coordinate the final RFP submission. Read all response drafts, pricing proposals, and compliance assessments from shared memory. Review for consistency, completeness, and quality. Verify every requirement is addressed. Assemble the final submission document as a polished artifact ready for review and submission.",
        tools: [
          "rag_answer",
          "rag_verify",
          "mission_read_memory",
          "mission_create_artifact",
        ],
        capabilities: ["coordination", "synthesis", "review"],
      },
    ],
    tasks: [
      {
        title: "Parse RFP requirements",
        description:
          "Extract and categorize all requirements from the RFP document — mandatory vs optional, evaluation criteria, weightings, and submission deadlines",
        priority: "P0",
        requiredCapabilities: ["research", "analysis"],
      },
      {
        title: "Match capabilities to requirements",
        description:
          "Map company products, features, and documentation to each RFP requirement — identify strengths, gaps, and mitigation strategies",
        priority: "P0",
        dependsOn: ["0"],
        requiredCapabilities: ["research", "analysis"],
      },
      {
        title: "Review compliance and legal requirements",
        description:
          "Verify compliance with security standards (SOC 2 Type II, GDPR, HIPAA), data handling policies, SLA requirements, and contractual terms",
        priority: "P0",
        dependsOn: ["0"],
        requiredCapabilities: ["research", "review"],
      },
      {
        title: "Analyze pricing and commercial terms",
        description:
          "Review pricing structure requirements, benchmark against competitors, and develop a competitive pricing proposal with volume tiers",
        priority: "P0",
        dependsOn: ["0"],
        requiredCapabilities: ["research", "analysis"],
      },
      {
        title: "Draft section responses",
        description:
          "Write detailed, persuasive responses for each RFP section using capability matches and compliance assessments as evidence",
        priority: "P1",
        dependsOn: ["1", "2"],
        requiredCapabilities: ["writing", "synthesis"],
      },
      {
        title: "Draft pricing proposal",
        description:
          "Produce a structured pricing proposal with licensing tiers, implementation costs, and support packages aligned to RFP requirements",
        priority: "P1",
        dependsOn: ["3"],
        requiredCapabilities: ["writing", "synthesis"],
      },
      {
        title: "Quality review and gap analysis",
        description:
          "Review all drafted sections and pricing for completeness, consistency, and quality — verify every requirement is addressed and flag remaining gaps",
        priority: "P1",
        dependsOn: ["4", "5"],
        requiredCapabilities: ["review", "coordination"],
      },
      {
        title: "Assemble final submission",
        description:
          "Compile all reviewed sections into a polished, submission-ready RFP response document with executive summary, table of contents, and appendices",
        priority: "P1",
        dependsOn: ["6"],
        requiredCapabilities: ["coordination", "synthesis"],
      },
    ],
  },
  {
    id: "incident-response",
    name: "Incident Response",
    description:
      "Commander triages an incident, spawns specialist agents on demand, coordinates via messaging, and escalates when blocked",
    defaultObjective:
      "Investigate and resolve a production incident: API latency spike across all endpoints starting 14:32 UTC. Triage severity, analyze logs for root cause, assess user impact and blast radius, spawn additional specialists if needed, and produce a structured incident report with timeline, root cause, and remediation steps.",
    vertical: "engineering",
    agents: [
      {
        name: "Incident Commander",
        role: "coordinator",
        soulPrompt:
          "You lead incident response. Triage severity, coordinate specialists, and drive toward root cause. Use mission_list_agents and mission_get_spawn_tree to track your team. Use mission_spawn_agent to bring in additional expertise (e.g., database specialist, network analyst) when existing agents lack the right capabilities — use mission_query_capabilities to decide. Send and receive messages to coordinate findings. Periodically evaluate progress with mission_evaluate_progress. If the team is stuck for more than two evaluation cycles, escalate with mission_escalate. Produce the final incident report as an artifact.",
        tools: [
          "search_hybrid",
          "mission_write_memory",
          "mission_read_memory",
          "mission_create_artifact",
          "mission_spawn_agent",
          "mission_query_capabilities",
          "mission_list_agents",
          "mission_get_spawn_tree",
          "mission_evaluate_progress",
          "mission_escalate",
          "mission_send_message",
          "mission_get_inbox",
        ],
        capabilities: [
          "coordination",
          "triage",
          "synthesis",
          "spawning",
          "messaging",
        ],
      },
      {
        name: "Log Analyst",
        role: "specialist",
        soulPrompt:
          "You analyze application logs, traces, and error patterns to identify anomalies correlated with the incident timeline. Search for error spikes, timeout patterns, and upstream/downstream failures. Report findings to the Incident Commander via messaging and write detailed evidence to shared memory.",
        tools: [
          "search_hybrid",
          "search_semantic",
          "doc_chunks",
          "mission_write_memory",
          "mission_send_message",
          "mission_get_inbox",
        ],
        capabilities: ["research", "analysis", "messaging"],
      },
      {
        name: "Impact Assessor",
        role: "specialist",
        soulPrompt:
          "You determine the blast radius and business impact of the incident. Identify affected services, user segments, SLA violations, and revenue impact. Classify severity (SEV1-SEV4) based on evidence. Report findings to the Incident Commander via messaging and write impact assessment to shared memory.",
        tools: [
          "search_hybrid",
          "doc_get",
          "rag_answer",
          "mission_write_memory",
          "mission_send_message",
          "mission_get_inbox",
        ],
        capabilities: ["research", "analysis", "messaging"],
      },
    ],
    tasks: [
      {
        title: "Triage incident",
        description:
          "Assess initial severity, identify affected systems, and establish an investigation timeline",
        priority: "P0",
        requiredCapabilities: ["triage"],
      },
      {
        title: "Analyze logs and traces",
        description:
          "Search application logs for error patterns, latency anomalies, and upstream/downstream failure correlation within the incident window",
        priority: "P0",
        requiredCapabilities: ["research", "analysis"],
      },
      {
        title: "Assess blast radius and impact",
        description:
          "Determine affected user segments, services, SLA violations, and classify overall severity",
        priority: "P0",
        requiredCapabilities: ["research", "analysis"],
      },
      {
        title: "Correlate findings and identify root cause",
        description:
          "Combine log analysis and impact data to pinpoint the root cause — spawn additional specialists if domain expertise is needed",
        priority: "P1",
        dependsOn: ["1", "2"],
        requiredCapabilities: ["coordination", "synthesis", "spawning"],
      },
      {
        title: "Produce incident report",
        description:
          "Write a structured incident report with timeline, root cause, impact summary, remediation steps, and follow-up action items",
        priority: "P1",
        dependsOn: ["3"],
        requiredCapabilities: ["coordination", "synthesis"],
      },
    ],
  },
  {
    id: "code-review",
    name: "Code Review",
    description:
      "Multi-perspective code review covering security, performance, and architecture quality",
    vertical: "engineering",
    agents: [
      {
        name: "Security Auditor",
        role: "specialist",
        soulPrompt:
          "You audit code for security vulnerabilities including injection attacks, auth bypass, data exposure, and OWASP top 10 issues. Provide specific line-level findings with severity ratings.",
        tools: ["search_hybrid", "doc_chunks", "mission_write_memory"],
      },
      {
        name: "Performance Analyst",
        role: "specialist",
        soulPrompt:
          "You analyze code for performance issues including N+1 queries, unnecessary allocations, missing indexes, and algorithmic complexity problems. Quantify impact where possible.",
        tools: ["doc_get", "doc_chunks", "mission_write_memory"],
      },
      {
        name: "Review Lead",
        role: "coordinator",
        soulPrompt:
          "You coordinate the code review by aggregating security and performance findings, adding architectural observations, and producing a unified review with prioritized action items.",
        tools: [
          "search_hybrid",
          "rag_answer",
          "mission_read_memory",
          "mission_create_artifact",
        ],
      },
    ],
    tasks: [
      {
        title: "Security scan",
        description:
          "Identify security vulnerabilities, auth issues, and data exposure risks with severity ratings",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Performance analysis",
        description:
          "Find performance bottlenecks, inefficient queries, and algorithmic complexity issues",
        priority: "P0",
        requiredCapabilities: ["research"],
      },
      {
        title: "Compile review report",
        description:
          "Aggregate all findings into a prioritized review report with specific remediation steps",
        priority: "P1",
        dependsOn: ["0", "1"],
        requiredCapabilities: ["coordination", "synthesis"],
      },
    ],
  },
];

const templateCardVariants = cva(
  "flex cursor-pointer flex-col gap-2 rounded-md border p-3 text-left transition-colors",
  {
    variants: {
      selected: {
        true: "border-primary bg-primary/5",
        false: "border-border/50 hover:border-border hover:bg-muted/30",
      },
    },
    defaultVariants: { selected: false },
  }
);

type TemplatePickerProps = {
  selectedId: string | null;
  onSelect: (template: MissionTemplate) => void;
  onStartFromScratch?: () => void;
};

export function TemplatePicker({
  selectedId,
  onSelect,
  onStartFromScratch,
}: TemplatePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MISSION_TEMPLATES.map((template) => (
          <button
            className={templateCardVariants({
              selected: selectedId === template.id,
            })}
            key={template.id}
            onClick={() => onSelect(template)}
            type="button"
          >
            <span className="font-medium text-sm">{template.name}</span>
            <span className="line-clamp-2 text-muted-foreground text-xs">
              {template.description}
            </span>
            <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icons.BotIcon size={12} />
                {template.agents.length} agents
              </span>
              <span className="flex items-center gap-1">
                <Icons.CheckCircle2 size={12} />
                {template.tasks.length} tasks
              </span>
            </div>
          </button>
        ))}
      </div>

      {onStartFromScratch && (
        <Button
          className="self-start"
          onClick={onStartFromScratch}
          size="sm"
          variant="ghost"
        >
          <Icons.Plus size={14} />
          Start from Scratch
        </Button>
      )}
    </div>
  );
}

export { templateCardVariants, MISSION_TEMPLATES };
