import type { MissionTemplate } from "@openplane/types/mission-control";

export const accountingTemplates: MissionTemplate[] = [
  {
    id: "accounting-invoice-intake",
    name: "Invoice Intake & Validation",
    description: "Extract, validate, and route incoming invoices",
    vertical: "accounting",
    agents: [
      {
        name: "invoice-extractor",
        role: "Extracts structured data from invoices",
        soulPrompt:
          "<role>You are an invoice data extractor. Parse invoices to extract vendor, amount, line items, dates, and payment terms.</role>",
        tools: ["doc_get", "doc_chunks"],
      },
      {
        name: "validation-agent",
        role: "Validates invoice data against purchase orders and contracts",
        soulPrompt:
          "<role>You are an invoice validator. Cross-reference invoice details against purchase orders, contracts, and vendor records.</role>",
        tools: ["search_hybrid", "doc_get"],
      },
    ],
    tasks: [
      {
        title: "Extract invoice data",
        description: "Parse and structure invoice information",
        priority: "P1",
      },
      {
        title: "Validate against PO",
        description: "Match invoice to purchase orders",
        priority: "P0",
      },
      {
        title: "Flag exceptions",
        description: "Identify discrepancies for review",
        priority: "P0",
      },
      {
        title: "Route for approval",
        description: "Route validated invoices for payment approval",
        priority: "P2",
      },
    ],
    complianceProfile: "regulated-finance",
  },
  {
    id: "accounting-reconciliation",
    name: "Account Reconciliation",
    description: "Cross-reference bank statements with internal records",
    vertical: "accounting",
    agents: [
      {
        name: "reconciler",
        role: "Matches transactions between sources",
        soulPrompt:
          "<role>You are a reconciliation specialist. Match transactions between bank statements and internal accounting records.</role>",
        tools: ["search_hybrid", "doc_get", "doc_chunks"],
      },
    ],
    tasks: [
      {
        title: "Import and parse statements",
        description: "Extract transactions from bank statements",
        priority: "P1",
      },
      {
        title: "Match transactions",
        description: "Cross-reference with internal records",
        priority: "P0",
      },
      {
        title: "Flag unmatched items",
        description: "Identify and categorize discrepancies",
        priority: "P0",
      },
    ],
    complianceProfile: "regulated-finance",
  },
];
