"use client";

import type {
  ExtractionField,
  ExtractionTemplate,
} from "@openbeam/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { SelectionCard } from "../../selection-card";

const TEMPLATE_DEFINITIONS: {
  id: ExtractionTemplate;
  name: string;
  description: string;
  icon: typeof Icons.FileText;
  fieldCount: number;
  fields: ExtractionField[];
}[] = [
  {
    id: "invoice",
    name: "Invoice",
    description: "Extract invoice details",
    icon: Icons.FileText,
    fieldCount: 10,
    fields: [
      {
        id: "vendor_name",
        name: "Vendor Name",
        type: "string",
        required: true,
      },
      { id: "vendor_address", name: "Vendor Address", type: "string" },
      {
        id: "invoice_number",
        name: "Invoice Number",
        type: "string",
        required: true,
      },
      {
        id: "invoice_date",
        name: "Invoice Date",
        type: "date",
        required: true,
      },
      { id: "due_date", name: "Due Date", type: "date" },
      { id: "line_items", name: "Line Items", type: "array" },
      { id: "subtotal", name: "Subtotal", type: "currency" },
      { id: "tax", name: "Tax", type: "currency" },
      { id: "total", name: "Total", type: "currency", required: true },
      { id: "payment_terms", name: "Payment Terms", type: "string" },
    ],
  },
  {
    id: "receipt",
    name: "Receipt",
    description: "Extract purchase receipts",
    icon: Icons.Receipt,
    fieldCount: 8,
    fields: [
      { id: "merchant", name: "Merchant", type: "string", required: true },
      { id: "date", name: "Date", type: "date", required: true },
      { id: "items", name: "Items", type: "array" },
      { id: "subtotal", name: "Subtotal", type: "currency" },
      { id: "tax", name: "Tax", type: "currency" },
      { id: "total", name: "Total", type: "currency", required: true },
      { id: "payment_method", name: "Payment Method", type: "string" },
      { id: "card_last_four", name: "Card Last 4", type: "string" },
    ],
  },
  {
    id: "contract",
    name: "Contract",
    description: "Extract legal agreements",
    icon: Icons.Scale,
    fieldCount: 9,
    fields: [
      { id: "parties", name: "Parties", type: "array", required: true },
      {
        id: "effective_date",
        name: "Effective Date",
        type: "date",
        required: true,
      },
      { id: "termination_date", name: "Termination Date", type: "date" },
      { id: "contract_value", name: "Contract Value", type: "currency" },
      { id: "payment_terms", name: "Payment Terms", type: "string" },
      { id: "key_obligations", name: "Key Obligations", type: "array" },
      { id: "termination_clauses", name: "Termination Clauses", type: "array" },
      { id: "governing_law", name: "Governing Law", type: "string" },
      { id: "signatures", name: "Signatures Required", type: "array" },
    ],
  },
  {
    id: "resume",
    name: "Resume",
    description: "Extract CV information",
    icon: Icons.User,
    fieldCount: 8,
    fields: [
      { id: "name", name: "Full Name", type: "string", required: true },
      { id: "email", name: "Email", type: "email", required: true },
      { id: "phone", name: "Phone", type: "phone" },
      { id: "location", name: "Location", type: "string" },
      { id: "summary", name: "Summary", type: "string" },
      { id: "experience", name: "Work Experience", type: "array" },
      { id: "education", name: "Education", type: "array" },
      { id: "skills", name: "Skills", type: "array" },
    ],
  },
  {
    id: "email",
    name: "Email",
    description: "Extract email metadata",
    icon: Icons.Mail,
    fieldCount: 6,
    fields: [
      { id: "from", name: "From", type: "email", required: true },
      { id: "to", name: "To", type: "array", required: true },
      { id: "subject", name: "Subject", type: "string", required: true },
      { id: "date", name: "Date", type: "date" },
      { id: "summary", name: "Summary", type: "string" },
      { id: "action_items", name: "Action Items", type: "array" },
    ],
  },
  {
    id: "meeting_notes",
    name: "Meeting Notes",
    description: "Extract meeting details",
    icon: Icons.Calendar,
    fieldCount: 7,
    fields: [
      { id: "title", name: "Meeting Title", type: "string", required: true },
      { id: "date", name: "Date", type: "date", required: true },
      { id: "attendees", name: "Attendees", type: "array" },
      { id: "agenda", name: "Agenda", type: "array" },
      { id: "decisions", name: "Decisions", type: "array" },
      { id: "action_items", name: "Action Items", type: "array" },
      { id: "next_meeting", name: "Next Meeting", type: "date" },
    ],
  },
  {
    id: "product",
    name: "Product",
    description: "Extract product info",
    icon: Icons.Package,
    fieldCount: 8,
    fields: [
      { id: "name", name: "Product Name", type: "string", required: true },
      { id: "sku", name: "SKU", type: "string" },
      { id: "description", name: "Description", type: "string" },
      { id: "price", name: "Price", type: "currency", required: true },
      { id: "category", name: "Category", type: "string" },
      { id: "brand", name: "Brand", type: "string" },
      { id: "features", name: "Features", type: "array" },
      { id: "specifications", name: "Specifications", type: "object" },
    ],
  },
  {
    id: "contact",
    name: "Contact",
    description: "Extract contact info",
    icon: Icons.UserPlus,
    fieldCount: 8,
    fields: [
      { id: "name", name: "Name", type: "string", required: true },
      { id: "email", name: "Email", type: "email" },
      { id: "phone", name: "Phone", type: "phone" },
      { id: "company", name: "Company", type: "string" },
      { id: "title", name: "Job Title", type: "string" },
      { id: "address", name: "Address", type: "string" },
      { id: "website", name: "Website", type: "url" },
      { id: "social_profiles", name: "Social Profiles", type: "array" },
    ],
  },
  {
    id: "event",
    name: "Event",
    description: "Extract event details",
    icon: Icons.CalendarDays,
    fieldCount: 8,
    fields: [
      { id: "name", name: "Event Name", type: "string", required: true },
      { id: "date", name: "Date", type: "date", required: true },
      { id: "time", name: "Time", type: "string" },
      { id: "location", name: "Location", type: "string" },
      { id: "organizer", name: "Organizer", type: "string" },
      { id: "description", name: "Description", type: "string" },
      { id: "attendees", name: "Expected Attendees", type: "number" },
      { id: "ticket_price", name: "Ticket Price", type: "currency" },
    ],
  },
];

export interface ExtractionTemplateSelectorProps {
  value: ExtractionTemplate | undefined;
  onChange: (template: ExtractionTemplate, fields: ExtractionField[]) => void;
  disabled?: boolean;
  className?: string;
}

export const ExtractionTemplateSelector = memo(
  function ExtractionTemplateSelectorComponent({
    value,
    onChange,
    disabled,
    className,
  }: ExtractionTemplateSelectorProps) {
    const handleSelect = useCallback(
      (templateId: ExtractionTemplate) => {
        const template = TEMPLATE_DEFINITIONS.find((t) => t.id === templateId);
        if (template) {
          onChange(templateId, template.fields);
        }
      },
      [onChange]
    );

    return (
      <div
        className={cn(
          "grid grid-cols-3 gap-2",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        {TEMPLATE_DEFINITIONS.map((template) => {
          const Icon = template.icon;
          const isSelected = value === template.id;

          return (
            <SelectionCard
              className="flex-col py-3"
              description={`${template.fieldCount} fields`}
              disabled={disabled}
              icon={
                <Icon
                  className={cn(
                    "size-5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              }
              key={template.id}
              label={template.name}
              layout="vertical"
              onClick={() => handleSelect(template.id)}
              selected={isSelected}
            />
          );
        })}
      </div>
    );
  }
);

ExtractionTemplateSelector.displayName = "ExtractionTemplateSelector";

export { TEMPLATE_DEFINITIONS };
