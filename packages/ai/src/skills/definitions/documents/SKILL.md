---
name: documents
description: Document management and analysis. List, retrieve, and analyze indexed documents across all connected sources.
category: documents
version: "1.0.0"
tools:
  - list_documents
  - get_document
  - get_document_chunks
triggers:
  keywords:
    - document
    - file
    - list
    - retrieve
    - chunks
    - content
examples:
  - input: "List recent documents from Google Drive"
  - input: "Get the full content of that document"
  - input: "Show me the chunks for document X"
---

# Documents Skill

Access and analyze indexed documents from all connected data sources.

## Available Tools

1. **list_documents** - List indexed documents with filtering
   - Filter by connector type, date range, author
   - Paginate through large result sets
   - Sort by relevance, date, or title

2. **get_document** - Retrieve full document content and metadata
   - Returns document title, content, author, dates
   - Includes connector source information
   - Access control enforced

3. **get_document_chunks** - Get processed chunks from a document
   - Returns semantic chunks with embeddings info
   - Useful for understanding document structure
   - Shows chunk boundaries and overlap

## Document Types

Documents come from various connected sources:
- **Google Drive**: Docs, Sheets, Slides, PDFs
- **Notion**: Pages, databases
- **Confluence**: Pages, spaces
- **Linear**: Issues, projects
- **Slack**: Messages, threads
- **Gmail**: Emails, threads

## Use Cases

- Retrieving specific documents by ID
- Listing recent documents from a source
- Analyzing document structure and content
- Building context from multiple documents

## Access Control

All document access respects user permissions:
- Only documents the user can access are returned
- Connector-level permissions are enforced
- Team-level isolation is maintained
