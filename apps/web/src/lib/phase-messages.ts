import type { JobType } from "./job-status";

export interface PhaseMessage {
  text: string;
  useEllipsis: boolean;
}

type PhaseMessageRegistry = Record<string, PhaseMessage>;
type ConnectorPhaseOverrides = Record<string, Partial<PhaseMessageRegistry>>;

const DEFAULT_PHASE_MESSAGES: PhaseMessageRegistry = {
  INITIALIZING: {
    text: "Connecting to data source",
    useEllipsis: true,
  },
  FETCHING: {
    text: "Fetching pages",
    useEllipsis: false,
  },
  TRANSFORMING: {
    text: "Processing documents",
    useEllipsis: true,
  },
  INDEXING: {
    text: "Indexing documents",
    useEllipsis: true,
  },
  FINALIZING: {
    text: "Finalizing sync",
    useEllipsis: true,
  },
  COMPLETED: {
    text: "Completed",
    useEllipsis: false,
  },
  FAILED: {
    text: "Failed",
    useEllipsis: false,
  },
  PROCESSING: {
    text: "Processing",
    useEllipsis: true,
  },
  PARSING: {
    text: "Parsing content",
    useEllipsis: true,
  },
  TRANSCRIBING: {
    text: "Transcribing audio",
    useEllipsis: true,
  },
};

const CONNECTOR_PHASE_OVERRIDES: ConnectorPhaseOverrides = {
  linear: {
    FETCHING: {
      text: "Fetching issues",
      useEllipsis: false,
    },
  },
  jira: {
    FETCHING: {
      text: "Fetching issues and projects",
      useEllipsis: false,
    },
  },
  github: {
    FETCHING: {
      text: "Fetching repositories",
      useEllipsis: false,
    },
  },
  gitlab: {
    FETCHING: {
      text: "Fetching projects",
      useEllipsis: false,
    },
  },
  notion: {
    FETCHING: {
      text: "Fetching pages",
      useEllipsis: false,
    },
  },
  slack: {
    FETCHING: {
      text: "Fetching messages",
      useEllipsis: false,
    },
  },
  gmail: {
    FETCHING: {
      text: "Fetching emails",
      useEllipsis: false,
    },
    TRANSFORMING: {
      text: "Processing threads",
      useEllipsis: true,
    },
  },
  "google-drive": {
    FETCHING: {
      text: "Fetching files",
      useEllipsis: false,
    },
  },
  confluence: {
    FETCHING: {
      text: "Fetching pages and spaces",
      useEllipsis: false,
    },
  },
  salesforce: {
    FETCHING: {
      text: "Fetching records",
      useEllipsis: false,
    },
  },
  hubspot: {
    FETCHING: {
      text: "Fetching contacts and deals",
      useEllipsis: false,
    },
  },
  zendesk: {
    FETCHING: {
      text: "Fetching tickets",
      useEllipsis: false,
    },
  },
  intercom: {
    FETCHING: {
      text: "Fetching conversations",
      useEllipsis: false,
    },
  },
};

export function getPhaseMessage(
  type: JobType,
  phase: string | undefined,
  connectorName?: string
): PhaseMessage | null {
  if (!phase) {
    return null;
  }

  const normalizedConnectorName = connectorName
    ?.toLowerCase()
    .replace(/_/g, "-");

  if (type === "sync" && normalizedConnectorName) {
    const connectorOverride =
      CONNECTOR_PHASE_OVERRIDES[normalizedConnectorName]?.[phase];
    if (connectorOverride) {
      return connectorOverride;
    }
  }

  return DEFAULT_PHASE_MESSAGES[phase] ?? null;
}
