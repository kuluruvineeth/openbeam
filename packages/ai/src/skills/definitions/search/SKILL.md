---
name: search
description: Enterprise search across all connected data sources. Provides hybrid semantic + keyword search, similar document finding, and search analytics.
category: search
version: "1.0.0"
tools:
  - search_hybrid
  - search_semantic
  - find_similar_documents
triggers:
  keywords:
    - search
    - find
    - look for
    - query
    - where is
    - locate
examples:
  - input: "Find documents about Q4 planning"
  - input: "Search for emails from last week about the budget"
  - input: "Where are the engineering specs?"
---

# Search Skill

You have access to powerful enterprise search capabilities across all connected data sources.

## Available Tools

1. **search_hybrid** - Combined semantic + keyword search (best for most queries)
   - Uses both vector embeddings and text matching
   - Automatically reranks results for relevance

2. **search_semantic** - Pure semantic/vector search (best for conceptual queries)
   - Finds conceptually related content even without keyword matches
   - Ideal for questions like "how does authentication work"

3. **find_similar_documents** - Find documents similar to a given document
   - Takes a document ID and finds related content
   - Useful for exploring related topics

## Best Practices

- Use hybrid search for most queries (balances precision and recall)
- Use semantic search when looking for conceptually related content
- Always respect access control - results are filtered by user permissions
- Include relevant filters (date range, connector type) to improve precision

## Query Optimization

- Be specific: "Q4 2024 sales projections" > "sales"
- Include entity names when known: "John's performance review"
- Use date filters for time-sensitive queries
- Specify connector types when searching specific sources

## Response Format

Always cite sources when presenting search results. Include:
- Document title
- Relevant excerpt
- Source connector
- Last updated date
