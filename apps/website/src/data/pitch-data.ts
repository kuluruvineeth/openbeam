export interface Slide {
  number: number;
  title: string;
  subtitle: string;
  timeSeconds: number;
}

export interface ProblemStat {
  value: string;
  label: string;
  source: string;
}

export interface WhyNowEvent {
  year: string;
  event: string;
  detail: string;
}

export interface SolutionSource {
  name: string;
  domain: "digital" | "physical" | "edge";
}

export interface ThesisStat {
  value: string;
  label: string;
  company?: string;
  source?: string;
}

export interface PlatformLayer {
  name: string;
  currentState: string;
  openbeamAnswer: string;
}

export interface Moat {
  number: number;
  name: string;
  description: string;
  evidence: string;
}

export interface HardwareCompany {
  name: string;
  product: string;
  scale: string;
}

export interface MarketSCurve {
  id: "s1" | "s2" | "s3";
  label: string;
  tam: string;
  timeline: string;
  color: string;
}

export interface Competitor {
  name: string;
  valuation: string;
  digitalKnowledge: boolean;
  physicalTelemetry: boolean;
  edgeAirGap: boolean;
  aiAgents: boolean;
  openSource: boolean;
  highlighted?: boolean;
}

export interface PricingTier {
  name: string;
  price: string;
  deployment: string;
  digitalConnectors: string;
  physicalConnectors: string;
  ai: string;
  edge: string;
  sla: string;
}

export interface TractionMetric {
  value: string;
  label: string;
}

export interface FinancialProjection {
  month: number;
  mrr: string;
  arr: string;
  customers: number;
}

export interface Connector {
  name: string;
  category: "saas" | "iot" | "industrial";
}

export interface InvestorFirm {
  name: string;
  physicalAiBets: string;
  signal: string;
}

export interface FundAllocation {
  category: string;
  percentage: number;
  purpose: string;
}

export interface SeedMilestone {
  milestone: string;
  timeline: string;
}

export const SLIDES: Slide[] = [
  {
    number: 1,
    title: "Title",
    subtitle: "Intelligence for the physical world",
    timeSeconds: 10,
  },
  {
    number: 2,
    title: "The Problem",
    subtitle: "$16.9M/year wasted on knowledge search",
    timeSeconds: 60,
  },
  {
    number: 3,
    title: "Why Now",
    subtitle: "Robots are arriving. They need a data platform.",
    timeSeconds: 45,
  },
  {
    number: 4,
    title: "The Solution",
    subtitle: "One platform spanning digital knowledge AND physical operations",
    timeSeconds: 30,
  },
  {
    number: 5,
    title: "Demo: Search",
    subtitle: "Search across Slack, Jira, AND BACnet sensors from one bar",
    timeSeconds: 60,
  },
  {
    number: 6,
    title: "Demo: Physical AI",
    subtitle: "Why is Building 3 running hot?",
    timeSeconds: 60,
  },
  {
    number: 7,
    title: "Demo: Agents",
    subtitle: "Agent detects anomaly, correlates, files work order",
    timeSeconds: 60,
  },
  {
    number: 8,
    title: "The Physical AI Thesis",
    subtitle: "AI had its ChatGPT moment. Robots are next.",
    timeSeconds: 60,
  },
  {
    number: 9,
    title: "The Robotics Data Platform",
    subtitle: "The Snowflake for physical operations",
    timeSeconds: 45,
  },
  {
    number: 10,
    title: "Technology Moat",
    subtitle: "5 moats: connectors, agents, edge, convergence, OSS",
    timeSeconds: 45,
  },
  {
    number: 11,
    title: "Hardware + Software",
    subtitle: "On-prem AI is back. We're ready.",
    timeSeconds: 30,
  },
  {
    number: 12,
    title: "Market Opportunity",
    subtitle: "$12B search to $180B physical ops to $750B+ robotics",
    timeSeconds: 30,
  },
  {
    number: 13,
    title: "Competitive Landscape",
    subtitle: "Only platform bridging digital + physical. Open source.",
    timeSeconds: 30,
  },
  {
    number: 14,
    title: "Business Model",
    subtitle: "Free OSS to $15/seat to $35/seat. 70% cheaper than Glean.",
    timeSeconds: 30,
  },
  {
    number: 15,
    title: "Go-to-Market",
    subtitle: "Enterprise search revenue funds physical AI R&D",
    timeSeconds: 30,
  },
  {
    number: 16,
    title: "Traction & Milestones",
    subtitle: "350K+ LOC, 25+ connectors, 2,400+ tests",
    timeSeconds: 30,
  },
  {
    number: 17,
    title: "Financial Projections",
    subtitle: "Path to $6M ARR in 36 months",
    timeSeconds: 30,
  },
  {
    number: 18,
    title: "Vision: Three S-Curves",
    subtitle: "Enterprise search is our wedge. Physical AI is our destiny.",
    timeSeconds: 45,
  },
  {
    number: 19,
    title: "Team",
    subtitle: "Founders + key hires + advisors",
    timeSeconds: 30,
  },
  {
    number: 20,
    title: "The Ask",
    subtitle: "$3-5M seed. This is inevitable.",
    timeSeconds: 30,
  },
];

export const PROBLEM_STATS: ProblemStat[] = [
  {
    value: "$16.9M",
    label: "Annual cost for a 500-person company",
    source: "McKinsey / IDC",
  },
  {
    value: "9.3 hrs",
    label: "Per week per worker spent searching",
    source: "McKinsey",
  },
  {
    value: "187",
    label: "Average SaaS tools per enterprise",
    source: "Productiv",
  },
  { value: "83%", label: "Workers who recreate existing work", source: "IDC" },
];

export const PHYSICAL_OPS_GAPS: Array<{
  system: string;
  currentState: string;
}> = [
  {
    system: "Factory sensor data (OPC-UA, BACnet)",
    currentState: "Trapped in proprietary SCADA systems",
  },
  {
    system: "Fleet telemetry (Samsara, GPS)",
    currentState: "Siloed in fleet-specific platforms",
  },
  {
    system: "Camera feeds (Verkada, ONVIF)",
    currentState: "Isolated security systems",
  },
  {
    system: "Robot data (ROS, LiDAR)",
    currentState: "Custom ETL per robot, per facility",
  },
  {
    system: "Maintenance records",
    currentState: "Scattered across Jira, SAP, spreadsheets",
  },
];

export const WHY_NOW_EVENTS: WhyNowEvent[] = [
  {
    year: "2025",
    event: "Figure AI $39B valuation",
    detail: "Robots building BMWs in 10-hour shifts",
  },
  {
    year: "2025",
    event: "$40.7B robotics VC",
    detail: "9% of ALL venture funding — record year",
  },
  {
    year: "2026",
    event: "Tesla Optimus",
    detail: "Factory for 10M units/year at Giga Texas",
  },
  {
    year: "2026",
    event: "LLM costs collapsed 280x",
    detail: "$20/M tokens (2022) to $0.07/M tokens",
  },
  {
    year: "2026",
    event: "On-prem AI hardware is back",
    detail: "Google, Qualcomm, HPE shipping AI appliances",
  },
  {
    year: "2026",
    event: "Data sovereignty mandatory",
    detail: "DORA, CMMC 2.0, EU AI Act deadlines",
  },
  {
    year: "2026",
    event: "Glean pricing vacuum",
    detail: "$50/seat, $150K min — 335,000 companies unserved",
  },
];

export const SOLUTION_SOURCES: SolutionSource[] = [
  { name: "Slack", domain: "digital" },
  { name: "Gmail", domain: "digital" },
  { name: "Jira", domain: "digital" },
  { name: "Confluence", domain: "digital" },
  { name: "GitHub", domain: "digital" },
  { name: "Notion", domain: "digital" },
  { name: "Linear", domain: "digital" },
  { name: "Salesforce", domain: "digital" },
  { name: "HubSpot", domain: "digital" },
  { name: "Samsara", domain: "physical" },
  { name: "Verkada", domain: "physical" },
  { name: "MQTT", domain: "physical" },
  { name: "OPC-UA", domain: "physical" },
  { name: "BACnet", domain: "physical" },
  { name: "SmartThings", domain: "physical" },
  { name: "AWS IoT Core", domain: "physical" },
  { name: "Azure IoT Hub", domain: "physical" },
  { name: "ThingsBoard", domain: "physical" },
  { name: "Node-RED", domain: "physical" },
  { name: "Matterport", domain: "physical" },
  { name: "SQLite + WAL", domain: "edge" },
  { name: "BLAKE3 Merkle", domain: "edge" },
  { name: "Offline AI", domain: "edge" },
  { name: "Local Vector Search", domain: "edge" },
];

export const THESIS_STATS: ThesisStat[] = [
  {
    value: "4 TB/hr",
    label: "Sensor data per autonomous vehicle",
    source: "Industry data",
  },
  {
    value: "$40.7B",
    label: "Robotics VC funding in 2025",
    source: "PitchBook",
  },
  {
    value: "$38B",
    label: "Humanoid robot market by 2035",
    company: "Goldman Sachs",
    source: "Goldman Sachs (revised 6x from $6B)",
  },
  {
    value: "$5T",
    label: "Total robotics market by 2050",
    company: "Morgan Stanley",
    source: "Morgan Stanley",
  },
  {
    value: "$39B",
    label: "Figure AI valuation",
    company: "Figure AI",
    source: "Series C",
  },
  {
    value: "$29B",
    label: "Scale AI valuation",
    company: "Scale AI",
    source: "Latest round",
  },
  {
    value: "$17B",
    label: "Samsara market cap",
    company: "Samsara",
    source: "NYSE",
  },
  {
    value: "$352B",
    label: "Palantir market cap",
    company: "Palantir",
    source: "NYSE",
  },
];

export const PLATFORM_LAYERS: PlatformLayer[] = [
  {
    name: "Ingestion",
    currentState: "Custom ETL per protocol",
    openbeamAnswer:
      "Universal connectors: MQTT, OPC-UA, BACnet, Samsara, Verkada, ROS",
  },
  {
    name: "Edge Processing",
    currentState: "Cloud-dependent, high latency",
    openbeamAnswer: "Offline-first, edge AI, local vector search",
  },
  {
    name: "Storage",
    currentState: "Generic blob storage (S3)",
    openbeamAnswer: "Time-series + spatial + documents, sensor fusion",
  },
  {
    name: "Search",
    currentState: "SQL queries on metadata",
    openbeamAnswer: "Semantic search across sensors, spatial, video, documents",
  },
  {
    name: "AI/ML",
    currentState: "Separate training pipelines",
    openbeamAnswer:
      "Integrated RAG, agent orchestration, training data curation",
  },
  {
    name: "Orchestration",
    currentState: "Manual scripts, cron jobs",
    openbeamAnswer: "Temporal workflows: sync, train, deploy, comply",
  },
  {
    name: "Compliance",
    currentState: "Spreadsheets",
    openbeamAnswer:
      "Automated audit trails, safety detection, regulatory reporting",
  },
];

export const FIVE_MOATS: Moat[] = [
  {
    number: 1,
    name: "Connector Flywheel",
    description:
      "25+ connectors spanning digital + physical + industrial. New connector in 2-3 hours.",
    evidence:
      "Each connector increases cross-source query value superlinearly. Airbyte reached $1.5B on connectors alone.",
  },
  {
    number: 2,
    name: "Agent-Native Architecture",
    description:
      "100+ tools. 9 orchestration patterns. Temporal-backed durable execution.",
    evidence:
      "As LLMs improve, our tool surface gets more valuable. Competitors bolt AI onto traditional APIs.",
  },
  {
    number: 3,
    name: "Edge Deployment",
    description:
      "SQLite + BLAKE3 Merkle sync + offline AI + local vector search. 533 tests passing.",
    evidence:
      "No competitor has this. Works air-gapped on oil rigs, factory floors, defense installations.",
  },
  {
    number: 4,
    name: "Physical-Digital Convergence",
    description:
      "The only platform bridging enterprise knowledge and physical operations data.",
    evidence: "Glean has no BACnet. Samsara has no Jira. We have both.",
  },
  {
    number: 5,
    name: "Open Source Community",
    description:
      "Full-stack, source available. Eliminates vendor lock-in objections.",
    evidence:
      "Vendor lock-in is the #1 objection in sovereign procurement. OSS removes it entirely.",
  },
];

export const HARDWARE_COMPANIES: HardwareCompany[] = [
  {
    name: "Google",
    product: "Distributed Cloud (air-gapped, DoD IL6)",
    scale: "Re-entered on-prem after killing GSA",
  },
  {
    name: "Qualcomm",
    product: "Dragonwing (70B models on one card)",
    scale: "Partnered with Siemens for factory AI",
  },
  {
    name: "HPE",
    product: "Private Cloud AI (with NVIDIA)",
    scale: "$1.1B in net new AI orders per quarter",
  },
  { name: "Dell", product: "PowerEdge AI Servers", scale: "$14.4B backlog" },
  {
    name: "Microsoft",
    product: "Azure Stack Edge + Blackwell GPUs",
    scale: "FIPS 140-3 Level 3 ready",
  },
  {
    name: "Intel",
    product: "Panther Lake",
    scale: "70B model running on a laptop at CES 2026",
  },
];

export const MARKET_SCURVES: MarketSCurve[] = [
  {
    id: "s1",
    label: "Enterprise Search",
    tam: "$12B",
    timeline: "NOW",
    color: "#2563EB",
  },
  {
    id: "s2",
    label: "Physical Ops",
    tam: "$180B",
    timeline: "YEAR 2",
    color: "#0D9488",
  },
  {
    id: "s3",
    label: "Robotics Platform",
    tam: "$750B+",
    timeline: "YEAR 3-5",
    color: "#D97706",
  },
];

export const COMPETITOR_FEATURES = [
  "Digital Knowledge",
  "Physical Telemetry",
  "Edge / Air-Gap",
  "AI Agents",
  "Open Source",
] as const;

export const COMPETITORS: Competitor[] = [
  {
    name: "Glean",
    valuation: "$7.2B",
    digitalKnowledge: true,
    physicalTelemetry: false,
    edgeAirGap: false,
    aiAgents: false,
    openSource: false,
  },
  {
    name: "Samsara",
    valuation: "$17B",
    digitalKnowledge: false,
    physicalTelemetry: true,
    edgeAirGap: false,
    aiAgents: false,
    openSource: false,
  },
  {
    name: "Nominal",
    valuation: "$1B",
    digitalKnowledge: false,
    physicalTelemetry: true,
    edgeAirGap: false,
    aiAgents: false,
    openSource: false,
  },
  {
    name: "Palantir",
    valuation: "$352B",
    digitalKnowledge: false,
    physicalTelemetry: false,
    edgeAirGap: true,
    aiAgents: true,
    openSource: false,
  },
  {
    name: "Scale AI",
    valuation: "$29B",
    digitalKnowledge: false,
    physicalTelemetry: true,
    edgeAirGap: false,
    aiAgents: false,
    openSource: false,
  },
  {
    name: "Foxglove",
    valuation: "~$200M",
    digitalKnowledge: false,
    physicalTelemetry: true,
    edgeAirGap: false,
    aiAgents: false,
    openSource: false,
  },
  {
    name: "OpenBeam",
    valuation: "Seed",
    digitalKnowledge: true,
    physicalTelemetry: true,
    edgeAirGap: true,
    aiAgents: true,
    openSource: true,
    highlighted: true,
  },
];

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Community",
    price: "Free",
    deployment: "Self-hosted",
    digitalConnectors: "Top 30",
    physicalConnectors: "MQTT, BACnet",
    ai: "BYO key",
    edge: "Community",
    sla: "None",
  },
  {
    name: "Pro",
    price: "$15/seat/mo",
    deployment: "Cloud or self-hosted",
    digitalConnectors: "100+",
    physicalConnectors: "All IoT/Industrial",
    ai: "Included",
    edge: "Standard",
    sla: "99.9%",
  },
  {
    name: "Enterprise",
    price: "$35/seat/mo",
    deployment: "Cloud or self-hosted",
    digitalConnectors: "100+",
    physicalConnectors: "All + spatial",
    ai: "Fine-tuned",
    edge: "Full (air-gap)",
    sla: "99.99%",
  },
  {
    name: "Enterprise+",
    price: "Custom",
    deployment: "On-prem + edge",
    digitalConnectors: "100+ + custom",
    physicalConnectors: "All + robotics",
    ai: "Custom models",
    edge: "Dedicated",
    sla: "99.99% + penalty",
  },
];

export const TRACTION_METRICS: TractionMetric[] = [
  { value: "350K+", label: "Lines of production code" },
  { value: "25+", label: "Connectors (digital + physical + industrial)" },
  { value: "2,400+", label: "Tests passing" },
  { value: "100+", label: "Agent tools" },
  { value: "533", label: "Edge computing tests" },
  { value: "10+", label: "Industrial protocol connectors" },
  { value: "5", label: "Applications (web, desktop, mobile, CLI, docs)" },
  { value: "$43/mo", label: "Full-stack infrastructure cost" },
];

export const FINANCIAL_PROJECTIONS: FinancialProjection[] = [
  { month: 6, mrr: "$2K", arr: "$24K", customers: 5 },
  { month: 10, mrr: "$10K", arr: "$120K", customers: 20 },
  { month: 12, mrr: "$25K", arr: "$300K", customers: 35 },
  { month: 18, mrr: "$75K", arr: "$900K", customers: 80 },
  { month: 24, mrr: "$150K", arr: "$1.8M", customers: 140 },
  { month: 36, mrr: "$500K", arr: "$6M", customers: 350 },
];

export const CASH_FLOW_POSITIVE_ARR = "$1.3M";
export const INFRASTRUCTURE_COST = "$43/mo";

export const CONNECTORS: Connector[] = [
  { name: "Slack", category: "saas" },
  { name: "Gmail", category: "saas" },
  { name: "Jira", category: "saas" },
  { name: "Confluence", category: "saas" },
  { name: "GitHub", category: "saas" },
  { name: "Notion", category: "saas" },
  { name: "Linear", category: "saas" },
  { name: "Salesforce", category: "saas" },
  { name: "HubSpot", category: "saas" },
  { name: "Google Drive", category: "saas" },
  { name: "OneDrive", category: "saas" },
  { name: "Dropbox", category: "saas" },
  { name: "Intercom", category: "saas" },
  { name: "Zendesk", category: "saas" },
  { name: "Asana", category: "saas" },
  { name: "Samsara", category: "iot" },
  { name: "Verkada", category: "iot" },
  { name: "SmartThings", category: "iot" },
  { name: "AWS IoT Core", category: "iot" },
  { name: "Azure IoT Hub", category: "iot" },
  { name: "ThingsBoard", category: "iot" },
  { name: "Node-RED", category: "iot" },
  { name: "MQTT", category: "industrial" },
  { name: "OPC-UA", category: "industrial" },
  { name: "BACnet", category: "industrial" },
  { name: "Matterport", category: "industrial" },
];

export const INVESTOR_FIRMS: InvestorFirm[] = [
  {
    name: "Lux Capital",
    physicalAiBets: "Physical Intelligence, Anduril",
    signal: "Raised $1.5B Fund IX (Jan 2026, largest ever)",
  },
  {
    name: "Founders Fund",
    physicalAiBets: "Nominal ($80M lead), Anduril",
    signal: "Deep conviction in hardware+software",
  },
  {
    name: "a16z",
    physicalAiBets: "Skydio, robotics portfolio",
    signal: "Raised $15B across 5 funds (Jan 2026)",
  },
  {
    name: "Sequoia",
    physicalAiBets: "Nominal ($75M Series B lead)",
    signal: "Backing hardware data platforms",
  },
  {
    name: "NVIDIA NVentures",
    physicalAiBets: "Agility, Figure AI",
    signal: "Cosmos platform adopted by all major robot cos",
  },
];

export const THE_ASK = {
  range: "$3-5M",
  stage: "Seed",
};

export const FUND_ALLOCATION: FundAllocation[] = [
  {
    category: "Engineering",
    percentage: 50,
    purpose: "4-6 engineers, 100 connectors, ROS2, cloud platform",
  },
  {
    category: "GTM",
    percentage: 20,
    purpose: "First AE/SE, content, community, design partners",
  },
  {
    category: "Infrastructure",
    percentage: 10,
    purpose: "Multi-tenant cloud, monitoring, SOC 2",
  },
  { category: "Operations", percentage: 10, purpose: "Legal, IP, compliance" },
  { category: "Reserve", percentage: 10, purpose: "4-month buffer" },
];

export const SEED_MILESTONES: SeedMilestone[] = [
  { milestone: "Cloud GA + multi-tenant", timeline: "Month 9" },
  { milestone: "100+ connectors (digital + physical)", timeline: "Month 12" },
  { milestone: "SOC 2 Type II", timeline: "Month 12-15" },
  { milestone: "$50K MRR", timeline: "Month 14-18" },
  { milestone: "ROS2 / robot fleet connector", timeline: "Month 15" },
  { milestone: "100 paying customers", timeline: "Month 18" },
  { milestone: "5,000+ GitHub stars", timeline: "Month 12" },
];

export const FIVE_YEAR_ARC: Array<{
  year: number;
  phase: string;
  tam: string;
  milestone: string;
}> = [
  {
    year: 1,
    phase: "Enterprise Search",
    tam: "$12B",
    milestone: "100 connectors, cloud GA, first enterprise deals",
  },
  {
    year: 2,
    phase: "Physical Operations",
    tam: "$48B",
    milestone: "20+ physical connectors, edge at 100 sites",
  },
  {
    year: 3,
    phase: "Robot Data Platform MVP",
    tam: "$180B",
    milestone: "ROS2 native, robot fleet dashboard",
  },
  {
    year: 4,
    phase: "Platform Network Effects",
    tam: "$300B",
    milestone: "Data marketplace, predictive ops",
  },
  {
    year: 5,
    phase: "The Standard for Physical AI",
    tam: "$500B+",
    milestone: "Default platform for humanoid deployment",
  },
];
