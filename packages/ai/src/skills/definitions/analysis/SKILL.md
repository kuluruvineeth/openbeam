---
name: analysis
description: Data analysis and insights generation. Analyze documents, extract entities, classify content, and generate reports.
category: analysis
version: "1.0.0"
tools:
  - classify_document
  - extract_entities
triggers:
  keywords:
    - analyze
    - classify
    - extract
    - entities
    - insights
    - report
examples:
  - input: "Classify this document by topic"
  - input: "Extract key entities from the meeting notes"
  - input: "What are the main themes in these documents?"
---

# Analysis Skill

Advanced document analysis for extracting insights and understanding content.

## Available Tools

1. **classify_document** - Classify documents by type or topic
   - Automatic categorization (technical, legal, marketing, etc.)
   - Custom classification schemas
   - Confidence scores for each category

2. **extract_entities** - Extract named entities from text
   - People, organizations, locations
   - Dates, amounts, technical terms
   - Product names and project references

## Entity Types

Extractable entities include:
- **PERSON**: Names of individuals
- **ORGANIZATION**: Company and team names
- **LOCATION**: Places and addresses
- **DATE**: Dates and time references
- **MONEY**: Financial amounts
- **PRODUCT**: Product and project names
- **TECHNICAL**: Technical terms and concepts

## Analysis Patterns

Common analysis workflows:

### Document Classification
1. Retrieve document content
2. Run classification tool
3. Use results for organization or routing

### Entity Extraction
1. Get document or search results
2. Extract entities from content
3. Build entity graph or summary

### Theme Analysis
1. Search for related documents
2. Extract entities from each
3. Identify common themes and patterns

## Best Practices

- Provide sufficient context for accurate classification
- Use entity extraction for building knowledge graphs
- Combine with search for comprehensive analysis
- Validate extracted entities when accuracy is critical
