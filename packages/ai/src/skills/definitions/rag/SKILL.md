---
name: rag
description: Retrieval-augmented generation for accurate, grounded Q&A. Combines search with LLM generation for factual answers with citations.
category: rag
version: "1.0.0"
tools:
  - rag_answer
  - rag_verify
  - rag_pure_answer
  - rag_pure_verify
triggers:
  keywords:
    - answer
    - explain
    - what is
    - how does
    - why
    - summarize
examples:
  - input: "What is our vacation policy?"
  - input: "Explain the authentication flow"
  - input: "Summarize the Q3 earnings report"
---

# RAG Skill

Retrieval-Augmented Generation for accurate, grounded answers from enterprise data.

## Available Tools

1. **rag_answer** - Generate grounded answers with full context
   - Retrieves relevant chunks from indexed documents
   - Generates answers with inline citations
   - Returns confidence scores and grounding metrics

2. **rag_verify** - Verify claims against source documents
   - Checks if statements are supported by retrieved evidence
   - Returns verification status and supporting passages

3. **rag_pure_answer** - Minimal RAG answer without tool context
   - Lighter weight for simple questions
   - Faster response time

4. **rag_pure_verify** - Minimal claim verification
   - Quick fact-checking against sources

## Grounding Principles

Every answer must be grounded in source documents:

- **ALWAYS** cite sources for factual claims
- **NEVER** generate information not found in documents
- **ACKNOWLEDGE** when information is partial or uncertain
- **DECLINE** to answer when sources are insufficient

## Confidence Levels

- **High (0.8-1.0)**: Multiple sources confirm the answer
- **Medium (0.5-0.8)**: Single source or partial confirmation
- **Low (0.0-0.5)**: Weak evidence, consider declining to answer

## Citation Format

Use inline citations: "The vacation policy allows 20 days PTO [HR Policy Doc, Section 3.2]"

## When to Use

- User asks factual questions about company data
- Need verifiable answers with sources
- Summarizing documents or policies
- Explaining technical concepts from documentation
