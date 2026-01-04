---
name: connectors
description: Manage and monitor data source integrations. List connectors, check sync status, and trigger syncs.
category: connectors
version: "1.0.0"
tools:
  - list_connectors
  - get_connector_status
  - trigger_connector_sync
triggers:
  keywords:
    - connector
    - integration
    - sync
    - connection
    - source
examples:
  - input: "What connectors are active?"
  - input: "Check the sync status of Slack"
  - input: "When was Google Drive last synced?"
---

# Connectors Skill

Manage and monitor data source integrations for enterprise search.

## Available Tools

1. **list_connectors** - List all configured connectors
   - Shows connector type, status, document counts
   - Filter by status (active, error, syncing)
   - Includes last sync timestamps

2. **get_connector_status** - Get detailed connector status
   - Current sync state and progress
   - Error messages if any
   - Document and chunk counts
   - Rate limit status

3. **trigger_connector_sync** - Start a sync operation
   - Trigger full or incremental sync
   - Returns job ID for tracking
   - Subject to rate limits

## Connector Types

Available integrations:
- **Productivity**: Google Drive, Notion, Confluence
- **Communication**: Slack, Gmail
- **Project Management**: Linear, Jira, GitHub
- **Other**: Custom API connectors

## Sync Types

- **Full Sync**: Re-indexes all documents (slower, comprehensive)
- **Incremental Sync**: Only new/changed documents (faster, regular)

## Status Indicators

- **Active**: Connector is healthy and syncing
- **Syncing**: Currently processing documents
- **Error**: Sync failed, needs attention
- **Paused**: Manually paused by user
- **Disconnected**: OAuth token expired or revoked

## Common Tasks

- Check which connectors are healthy
- Diagnose sync failures
- Monitor document counts across sources
- Trigger manual syncs when needed
