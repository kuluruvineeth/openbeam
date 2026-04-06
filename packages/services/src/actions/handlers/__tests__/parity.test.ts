import { describe, expect, it } from "bun:test";
import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import { getHandler, getRegisteredTypes } from "../../handler-registry";
import "..";

type Gap = {
  definitionMissing: readonly string[];
  handlerMissing: readonly string[];
};

const KNOWN_GAPS: Record<string, Gap> = {
  asana: {
    definitionMissing: ["task_comment"],
    handlerMissing: ["comment_add"],
  },
  azure_devops: {
    definitionMissing: [
      "workitem_comment",
      "workitem_create",
      "workitem_update",
    ],
    handlerMissing: [
      "work_item_comment",
      "work_item_create",
      "work_item_update",
    ],
  },
  bitbucket: {
    definitionMissing: ["pr_comment", "pr_create"],
    handlerMissing: ["pull_request_comment", "pull_request_create"],
  },
  clickup: {
    definitionMissing: ["task_comment"],
    handlerMissing: ["task_add_comment"],
  },
  dropbox: {
    definitionMissing: ["entry_delete", "entry_move"],
    handlerMissing: ["file_delete", "file_move"],
  },
  freshservice: {
    definitionMissing: ["ticket_note"],
    handlerMissing: ["ticket_add_note"],
  },
  gitlab: {
    definitionMissing: ["issue_note", "issue_update", "mr_create", "mr_note"],
    handlerMissing: [
      "issue_comment",
      "merge_request_comment",
      "merge_request_create",
    ],
  },
  gmail: {
    definitionMissing: [],
    handlerMissing: [
      "email_forward",
      "email_get",
      "email_modify_labels",
      "email_search",
      "email_trash",
      "label_create",
      "label_list",
      "thread_get",
      "thread_trash",
    ],
  },
  google_drive: {
    definitionMissing: [
      "file_trash",
      "file_untrash",
      "folder_delete",
      "folder_move",
      "folder_rename",
      "folder_trash",
      "permission_revoke",
      "permission_share",
      "permission_transfer_ownership",
      "permission_update",
    ],
    handlerMissing: [
      "file_get",
      "file_search",
      "permission_create",
      "permission_remove",
    ],
  },
  greenhouse: {
    definitionMissing: ["candidate_note_add"],
    handlerMissing: ["add_candidate_note"],
  },
  haystack: {
    definitionMissing: [],
    handlerMissing: ["person_update"],
  },
  jira: {
    definitionMissing: ["issue_comment"],
    handlerMissing: ["comment_add", "issue_add_watcher", "issue_search"],
  },
  monday: {
    definitionMissing: ["item_move"],
    handlerMissing: ["item_move_to_group"],
  },
  notion: {
    definitionMissing: [
      "block_update",
      "comment_add_block",
      "comment_add_page",
      "database_entry_create",
      "database_entry_update",
      "page_restore",
    ],
    handlerMissing: [
      "comment_create",
      "database_create",
      "database_query",
      "page_get",
      "search",
    ],
  },
  opsgenie: {
    definitionMissing: ["alert_note_add"],
    handlerMissing: ["alert_add_note"],
  },
  pagerduty: {
    definitionMissing: ["incident_note_add", "incident_status_update"],
    handlerMissing: [
      "incident_acknowledge",
      "incident_add_note",
      "incident_resolve",
    ],
  },
  salesforce: {
    definitionMissing: [],
    handlerMissing: ["record_search"],
  },
  samsara: {
    definitionMissing: ["driver_message_send"],
    handlerMissing: ["driver_message"],
  },
  servicenow: {
    definitionMissing: ["incident_comment"],
    handlerMissing: ["comment_add"],
  },
  slack: {
    definitionMissing: [],
    handlerMissing: [],
  },
  zendesk: {
    definitionMissing: ["ticket_comment"],
    handlerMissing: ["comment_add"],
  },
};

function normalizeType(type: string): string {
  return type.toLowerCase().trim().replace(/-/g, "_");
}

function diffSets(
  defined: readonly string[],
  registered: readonly string[]
): Gap {
  const definedSet = new Set(defined);
  const registeredSet = new Set(registered);
  return {
    definitionMissing: [...registeredSet]
      .filter((id) => !definedSet.has(id))
      .sort(),
    handlerMissing: [...definedSet]
      .filter((id) => !registeredSet.has(id))
      .sort(),
  };
}

function expectedGap(connectorType: string): Gap {
  return (
    KNOWN_GAPS[connectorType] ?? {
      definitionMissing: [],
      handlerMissing: [],
    }
  );
}

describe("connector action parity", () => {
  it("every registry has a matching handler registered", () => {
    const registered = new Set(getRegisteredTypes());
    const unmatched: string[] = [];
    for (const registry of ALL_CONNECTOR_ACTION_REGISTRIES) {
      const normalized = normalizeType(registry.connectorType);
      if (!registered.has(normalized)) {
        unmatched.push(normalized);
      }
    }
    expect(unmatched).toEqual([]);
  });

  it("every handler declares supportedActions", () => {
    const undeclared: string[] = [];
    for (const type of getRegisteredTypes()) {
      const handler = getHandler(type);
      if (!handler?.supportedActions) {
        undeclared.push(type);
      }
    }
    expect(undeclared).toEqual([]);
  });

  it("KNOWN_GAPS entries reference only registered connectors", () => {
    const registered = new Set(getRegisteredTypes());
    const orphans = Object.keys(KNOWN_GAPS).filter((k) => !registered.has(k));
    expect(orphans).toEqual([]);
  });

  for (const registry of ALL_CONNECTOR_ACTION_REGISTRIES) {
    const normalizedType = normalizeType(registry.connectorType);
    const definedActionIds = registry.actions.map((a) => a.id).sort();

    it(`${normalizedType} action parity matches expected gap`, () => {
      const handler = getHandler(normalizedType);
      expect(handler).toBeDefined();
      if (!handler) {
        return;
      }

      const actualGap = diffSets(definedActionIds, handler.supportedActions);
      const expected = expectedGap(normalizedType);

      expect(actualGap.definitionMissing).toEqual([
        ...expected.definitionMissing,
      ]);
      expect(actualGap.handlerMissing).toEqual([...expected.handlerMissing]);
    });
  }
});
