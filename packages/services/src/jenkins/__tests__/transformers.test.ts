import { describe, expect, test } from "bun:test";
import type { JenkinsTransformContext } from "@openbeam/types/services/connectors/jenkins";
import type { JenkinsBuild } from "../api/builds";
import type { JenkinsJob } from "../api/jobs";
import type { JenkinsNode } from "../api/nodes";
import type { JenkinsView } from "../api/views";
import { transformBuild } from "../transformers/build";
import { transformJob } from "../transformers/job";
import { transformNode } from "../transformers/node";
import {
  formatBuildResult,
  formatDuration,
  formatJobStatus,
} from "../transformers/utils";
import { transformView } from "../transformers/view";

const CONTEXT: JenkinsTransformContext = {
  connectorId: "conn_jenkins_test",
  connectorType: "JENKINS",
  teamId: "team_test",
  workspaceId: "ws_test",
  instanceUrl: "https://jenkins.example.com",
};

describe("formatBuildResult", () => {
  test("maps known results to labels", () => {
    expect(formatBuildResult("SUCCESS")).toBe("Success");
    expect(formatBuildResult("FAILURE")).toBe("Failure");
    expect(formatBuildResult("UNSTABLE")).toBe("Unstable");
    expect(formatBuildResult("ABORTED")).toBe("Aborted");
    expect(formatBuildResult("NOT_BUILT")).toBe("Not Built");
  });

  test("returns In Progress for null", () => {
    expect(formatBuildResult(null)).toBe("In Progress");
  });

  test("returns raw value for unknown results", () => {
    expect(formatBuildResult("CUSTOM_RESULT")).toBe("CUSTOM_RESULT");
  });
});

describe("formatJobStatus", () => {
  test("maps colors to status labels", () => {
    expect(formatJobStatus("blue")).toBe("Stable");
    expect(formatJobStatus("red")).toBe("Failed");
    expect(formatJobStatus("yellow")).toBe("Unstable");
    expect(formatJobStatus("disabled")).toBe("Disabled");
    expect(formatJobStatus("blue_anime")).toBe("Building (Stable)");
  });

  test("returns raw value for unknown colors", () => {
    expect(formatJobStatus("custom_color")).toBe("custom_color");
  });
});

describe("formatDuration", () => {
  test("formats seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(59_000)).toBe("59s");
  });

  test("formats minutes", () => {
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(125_000)).toBe("2m 5s");
  });

  test("formats hours", () => {
    expect(formatDuration(3_600_000)).toBe("1h");
    expect(formatDuration(5_400_000)).toBe("1h 30m");
  });
});

describe("transformJob", () => {
  const JOB: JenkinsJob = {
    name: "my-pipeline",
    fullName: "folder/my-pipeline",
    url: "https://jenkins.example.com/job/folder/job/my-pipeline/",
    color: "blue",
    description: "Builds the main application",
    buildable: true,
    healthReport: [
      { description: "Build stability: No recent builds failed.", score: 100 },
    ],
    lastBuild: {
      number: 42,
      url: "https://jenkins.example.com/job/folder/job/my-pipeline/42/",
      result: "SUCCESS",
      timestamp: 1_700_000_000_000,
    },
  };

  test("produces correct document structure", async () => {
    const doc = await transformJob(JOB, CONTEXT);
    expect(doc.id).toBe("conn_jenkins_test_job_folder%2Fmy-pipeline");
    expect(doc.document_type).toBe("job");
    expect(doc.title).toBe("folder/my-pipeline");
    expect(doc.source_type).toBe("jenkins");
    expect(doc.connector_id).toBe("conn_jenkins_test");
    expect(doc.team_id).toBe("team_test");
  });

  test("includes health report in content", async () => {
    const doc = await transformJob(JOB, CONTEXT);
    expect(doc.content).toContain("Health:");
    expect(doc.content).toContain("100%");
  });

  test("includes metadata fields", async () => {
    const doc = await transformJob(JOB, CONTEXT);
    expect(doc.metadata?.status).toBe("Stable");
    expect(doc.metadata?.healthScore).toBe(100);
    expect(doc.metadata?.lastBuildNumber).toBe(42);
  });
});

describe("transformBuild", () => {
  const BUILD: JenkinsBuild = {
    number: 42,
    url: "https://jenkins.example.com/job/my-job/42/",
    result: "SUCCESS",
    timestamp: 1_700_000_000_000,
    duration: 125_000,
    estimatedDuration: 120_000,
    building: false,
    actions: [
      {
        causes: [
          {
            shortDescription: "Started by user admin",
            userName: "admin",
            userId: "admin",
          },
        ],
      },
      {
        parameters: [{ name: "BRANCH", value: "main" }],
      },
    ],
  };

  test("produces correct document structure", async () => {
    const doc = await transformBuild(BUILD, "my-job", CONTEXT);
    expect(doc.id).toBe("conn_jenkins_test_build_my-job_42");
    expect(doc.document_type).toBe("build");
    expect(doc.title).toBe("my-job #42 - Success");
    expect(doc.author_name).toBe("admin");
  });

  test("includes parameters in content", async () => {
    const doc = await transformBuild(BUILD, "my-job", CONTEXT);
    expect(doc.content).toContain("BRANCH=main");
  });

  test("includes console output when provided", async () => {
    const doc = await transformBuild(
      BUILD,
      "my-job",
      CONTEXT,
      "Build started\nBuild finished"
    );
    expect(doc.content).toContain("Console Output:");
    expect(doc.content).toContain("Build started");
  });

  test("includes metadata", async () => {
    const doc = await transformBuild(BUILD, "my-job", CONTEXT);
    expect(doc.metadata?.buildNumber).toBe(42);
    expect(doc.metadata?.result).toBe("SUCCESS");
    expect(doc.metadata?.durationLabel).toBe("2m 5s");
    expect(doc.metadata?.triggeredBy).toBe("admin");
  });
});

describe("transformView", () => {
  const VIEW: JenkinsView = {
    name: "Backend",
    url: "https://jenkins.example.com/view/Backend/",
    description: "Backend build jobs",
    jobs: [
      {
        name: "api-server",
        url: "https://jenkins.example.com/job/api-server/",
        color: "blue",
      },
      {
        name: "worker",
        url: "https://jenkins.example.com/job/worker/",
        color: "red",
      },
    ],
  };

  test("produces correct document structure", async () => {
    const doc = await transformView(VIEW, CONTEXT);
    expect(doc.id).toBe("conn_jenkins_test_view_Backend");
    expect(doc.document_type).toBe("view");
    expect(doc.title).toBe("View: Backend");
  });

  test("includes job list in content", async () => {
    const doc = await transformView(VIEW, CONTEXT);
    expect(doc.content).toContain("api-server");
    expect(doc.content).toContain("worker");
    expect(doc.content).toContain("Jobs (2)");
  });
});

describe("transformNode", () => {
  const NODE: JenkinsNode = {
    displayName: "linux-agent-01",
    description: "Linux build agent",
    idle: true,
    jnlpAgent: true,
    numExecutors: 4,
    offline: false,
    temporarilyOffline: false,
    monitorData: {
      "hudson.node_monitors.ArchitectureMonitor": "Linux (amd64)",
    },
  };

  test("produces correct document structure", async () => {
    const doc = await transformNode(NODE, CONTEXT);
    expect(doc.id).toBe("conn_jenkins_test_node_linux-agent-01");
    expect(doc.document_type).toBe("node");
    expect(doc.title).toBe("Agent: linux-agent-01");
  });

  test("includes architecture in content", async () => {
    const doc = await transformNode(NODE, CONTEXT);
    expect(doc.content).toContain("Linux (amd64)");
  });

  test("names controller node correctly", async () => {
    const controller: JenkinsNode = {
      ...NODE,
      displayName: "Built-In Node",
    };
    const doc = await transformNode(controller, CONTEXT);
    expect(doc.title).toBe("Jenkins Controller");
  });
});
