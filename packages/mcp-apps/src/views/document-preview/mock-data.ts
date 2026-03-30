export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  source: string;
  connectorName: string;
  url?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  documentType?: string;
}

export interface DocumentData {
  document: DocumentRecord;
}

export const MOCK_DOCUMENT_DATA: DocumentData = {
  document: {
    id: "doc_123",
    title: "API Security Best Practices",
    content:
      "This document outlines the security best practices for building and maintaining our API infrastructure. Key areas include authentication, rate limiting, input validation, and audit logging...",
    source: "NOTION",
    connectorName: "Notion (Engineering)",
    url: "https://notion.so/api-security-best-practices",
    author: "Kuluru Vineeth",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-03-20T14:30:00Z",
    documentType: "page",
  },
};
