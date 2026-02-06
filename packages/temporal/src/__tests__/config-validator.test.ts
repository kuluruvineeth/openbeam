import type { ExecutionPlanNode } from "@openplane/types/canvas";
import { describe, expect, it } from "vitest";
import {
  validateApprovalConfig,
  validateConditionConfig,
  validateInputConfig,
  validateLoopConfig,
  validateParallelJoinConfig,
  validateParallelMapConfig,
  validateParallelSplitConfig,
  validateSubWorkflowConfig,
  validateTryCatchConfig,
} from "../workflows/canvas/validators/config-validator";

function createNode(
  id: string,
  type: string,
  config: unknown = {}
): ExecutionPlanNode {
  return {
    id,
    type,
    data: { config },
    inbound: [],
    outbound: [],
  } as unknown as ExecutionPlanNode;
}

describe("validateConditionConfig", () => {
  it("accepts valid condition config", () => {
    const node = createNode("cond_1", "condition", {
      branches: [
        { id: "true", label: "Yes", groups: [] },
        { id: "false", label: "No", groups: [] },
      ],
    });
    const issues: string[] = [];
    const result = validateConditionConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("rejects invalid condition config", () => {
    const node = createNode("cond_1", "condition", "not-an-object");
    const issues: string[] = [];
    validateConditionConfig(node, issues);

    expect(issues).toContain("Condition node cond_1 has invalid config");
  });
});

describe("validateApprovalConfig", () => {
  it("accepts valid minimal approval config", () => {
    const node = createNode("appr_1", "approval", {
      message: "Please approve",
      approvalType: "single",
      requiredApprovals: 1,
      allowedActions: ["approve", "reject"],
    });
    const issues: string[] = [];
    const result = validateApprovalConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("flags unsupported approval type", () => {
    const node = createNode("appr_1", "approval", {
      message: "Approve this",
      approvalType: "parallel",
      requiredApprovals: 1,
      allowedActions: ["approve", "reject"],
    });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain(
      "Approval node appr_1 uses unsupported approval type parallel"
    );
  });

  it("flags unsupported approval count", () => {
    const node = createNode("appr_1", "approval", {
      message: "Approve this",
      approvalType: "single",
      requiredApprovals: 3,
      allowedActions: ["approve", "reject"],
    });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain(
      "Approval node appr_1 requires unsupported approval count 3"
    );
  });

  it("flags unsupported actions", () => {
    const node = createNode("appr_1", "approval", {
      message: "Approve this",
      approvalType: "single",
      requiredApprovals: 1,
      allowedActions: ["approve", "delegate"],
    });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain("Approval node appr_1 has unsupported actions");
  });

  it("flags escalate timeout action", () => {
    const node = createNode("appr_1", "approval", {
      message: "Approve this",
      approvalType: "single",
      requiredApprovals: 1,
      allowedActions: ["approve", "reject"],
      timeoutAction: "escalate",
    });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain(
      "Approval node appr_1 uses unsupported timeout action escalate"
    );
  });

  it("flags auto-approve", () => {
    const node = createNode("appr_1", "approval", {
      message: "Approve this",
      approvalType: "single",
      requiredApprovals: 1,
      allowedActions: ["approve", "reject"],
      autoApprove: true,
    });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain(
      "Approval node appr_1 does not support auto-approve"
    );
  });

  it("flags escalation", () => {
    const node = createNode("appr_1", "approval", {
      message: "Approve this",
      approvalType: "single",
      requiredApprovals: 1,
      allowedActions: ["approve", "reject"],
      escalation: { enabled: true },
    });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain(
      "Approval node appr_1 does not support escalation"
    );
  });

  it("flags notifications", () => {
    const node = createNode("appr_1", "approval", {
      message: "Approve this",
      approvalType: "single",
      requiredApprovals: 1,
      allowedActions: ["approve", "reject"],
      notification: { channels: ["email"] },
    });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain(
      "Approval node appr_1 does not support notifications"
    );
  });

  it("rejects invalid schema", () => {
    const node = createNode("appr_1", "approval", { invalid: true });
    const issues: string[] = [];
    validateApprovalConfig(node, issues);

    expect(issues).toContain("Approval node appr_1 has invalid config");
  });
});

describe("validateInputConfig", () => {
  it("accepts valid input config", () => {
    const node = createNode("input_1", "input", {
      prompt: "Enter values",
      fields: [{ id: "name", label: "Name", type: "text" }],
    });
    const issues: string[] = [];
    const result = validateInputConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("flags duplicate field IDs", () => {
    const node = createNode("input_1", "input", {
      prompt: "Enter values",
      fields: [
        { id: "name", label: "Name", type: "text" },
        { id: "name", label: "Name 2", type: "text" },
      ],
    });
    const issues: string[] = [];
    validateInputConfig(node, issues);

    expect(issues).toContain("Input node input_1 has duplicate field id name");
  });

  it("flags skip timeout without allowSkip", () => {
    const node = createNode("input_1", "input", {
      prompt: "Enter values",
      fields: [{ id: "name", label: "Name", type: "text" }],
      timeoutMs: 5000,
      timeoutAction: "skip",
      allowSkip: false,
    });
    const issues: string[] = [];
    validateInputConfig(node, issues);

    expect(issues).toContain(
      "Input node input_1 timeoutAction skip requires allowSkip true"
    );
  });

  it("flags default timeout without defaults for required fields", () => {
    const node = createNode("input_1", "input", {
      prompt: "Enter values",
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          validation: { required: true },
        },
      ],
      timeoutMs: 5000,
      timeoutAction: "default",
    });
    const issues: string[] = [];
    validateInputConfig(node, issues);

    expect(issues).toContain(
      "Input node input_1 default timeout requires defaults for required fields"
    );
  });

  it("accepts default timeout when required fields have defaults", () => {
    const node = createNode("input_1", "input", {
      prompt: "Enter values",
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          validation: { required: true },
          defaultValue: "default_name",
        },
      ],
      timeoutMs: 5000,
      timeoutAction: "default",
    });
    const issues: string[] = [];
    validateInputConfig(node, issues);

    expect(issues.find((i) => i.includes("default timeout"))).toBeUndefined();
  });
});

describe("validateLoopConfig", () => {
  it("accepts valid forEach loop", () => {
    const node = createNode("loop_1", "loop", {
      type: "forEach",
      collection: "items",
    });
    const issues: string[] = [];
    const result = validateLoopConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("flags non-sequential execution mode", () => {
    const node = createNode("loop_1", "loop", {
      type: "forEach",
      collection: "items",
      executionMode: "parallel",
    });
    const issues: string[] = [];
    validateLoopConfig(node, issues);

    expect(issues).toContain(
      "Loop node loop_1 uses unsupported execution mode parallel"
    );
  });

  it("flags forEach missing collection", () => {
    const node = createNode("loop_1", "loop", {
      type: "forEach",
      collection: "",
    });
    const issues: string[] = [];
    validateLoopConfig(node, issues);

    expect(issues).toContain(
      "Loop node loop_1 is missing collection expression"
    );
  });

  it("flags while missing condition", () => {
    const node = createNode("loop_1", "loop", {
      type: "while",
      condition: "",
    });
    const issues: string[] = [];
    validateLoopConfig(node, issues);

    expect(issues).toContain(
      "Loop node loop_1 is missing condition expression"
    );
  });

  it("flags times missing count", () => {
    const node = createNode("loop_1", "loop", {
      type: "times",
    });
    const issues: string[] = [];
    validateLoopConfig(node, issues);

    expect(issues).toContain("Loop node loop_1 is missing iteration count");
  });

  it("flags aggregate output without expression", () => {
    const node = createNode("loop_1", "loop", {
      type: "forEach",
      collection: "items",
      outputMode: "aggregate",
      aggregateExpression: "",
    });
    const issues: string[] = [];
    validateLoopConfig(node, issues);

    expect(issues).toContain(
      "Loop node loop_1 is missing aggregation expression"
    );
  });
});

describe("validateSubWorkflowConfig", () => {
  it("accepts valid sub-workflow config with passthrough input", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
      waitForCompletion: true,
      inputMode: "passthrough",
    });
    const issues: string[] = [];
    const result = validateSubWorkflowConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("accepts valid sub-workflow config with field mappings", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
      waitForCompletion: true,
      inputMode: "fields",
      inputMappings: { param1: "value1" },
    });
    const issues: string[] = [];
    const result = validateSubWorkflowConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("flags empty workflow ID", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "  ",
      waitForCompletion: true,
    });
    const issues: string[] = [];
    validateSubWorkflowConfig(node, issues);

    expect(issues).toContain("Sub-workflow node sub_1 is missing workflow ID");
  });

  it("flags retryOnFailure", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
      retryOnFailure: true,
    });
    const issues: string[] = [];
    validateSubWorkflowConfig(node, issues);

    expect(issues).toContain(
      "Sub-workflow node sub_1 does not support retries"
    );
  });

  it("flags fields input mode with no mappings", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
      inputMode: "fields",
      inputMappings: {},
    });
    const issues: string[] = [];
    validateSubWorkflowConfig(node, issues);

    expect(issues).toContain("Sub-workflow node sub_1 requires input mappings");
  });

  it("flags timeout without waitForCompletion", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
      waitForCompletion: false,
      timeoutMs: 5000,
    });
    const issues: string[] = [];
    validateSubWorkflowConfig(node, issues);

    expect(issues).toContain("Sub-workflow node sub_1 timeout requires wait");
  });

  it("flags output mappings without waitForCompletion", () => {
    const node = createNode("sub_1", "sub_workflow", {
      workflowId: "wf_123",
      waitForCompletion: false,
      outputMappings: { result: "$.output" },
    });
    const issues: string[] = [];
    validateSubWorkflowConfig(node, issues);

    expect(issues).toContain(
      "Sub-workflow node sub_1 output mappings require wait"
    );
  });
});

describe("validateParallelSplitConfig", () => {
  it("accepts valid parallel split config", () => {
    const node = createNode("split_1", "parallel_split", {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
    });
    const issues: string[] = [];
    const result = validateParallelSplitConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("flags partition without key", () => {
    const node = createNode("split_1", "parallel_split", {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      dataDistribution: "partition",
      partitionKey: "",
    });
    const issues: string[] = [];
    validateParallelSplitConfig(node, issues);

    expect(issues).toContain(
      "Parallel split node split_1 requires partition key"
    );
  });
});

describe("validateParallelJoinConfig", () => {
  it("accepts valid parallel join config", () => {
    const node = createNode("join_1", "parallel_join", {
      inputs: [
        { id: "i1", label: "Input 1" },
        { id: "i2", label: "Input 2" },
      ],
    });
    const issues: string[] = [];
    const result = validateParallelJoinConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("rejects invalid config", () => {
    const node = createNode("join_1", "parallel_join", { inputs: [] });
    const issues: string[] = [];
    validateParallelJoinConfig(node, issues);

    expect(issues).toContain("Parallel join node join_1 has invalid config");
  });
});

describe("validateParallelMapConfig", () => {
  it("accepts valid parallel map config", () => {
    const node = createNode("map_1", "parallel_map", {
      collection: "items",
    });
    const issues: string[] = [];
    const result = validateParallelMapConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("flags empty collection", () => {
    const node = createNode("map_1", "parallel_map", {
      collection: "  ",
    });
    const issues: string[] = [];
    validateParallelMapConfig(node, issues);

    expect(issues).toContain(
      "Parallel map node map_1 requires collection expression"
    );
  });
});

describe("validateTryCatchConfig", () => {
  it("accepts valid try-catch config", () => {
    const node = createNode("tc_1", "try_catch", {});
    const issues: string[] = [];
    const result = validateTryCatchConfig(node, issues);

    expect(result.success).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it("rejects invalid config", () => {
    const node = createNode("tc_1", "try_catch", "not-an-object");
    const issues: string[] = [];
    validateTryCatchConfig(node, issues);

    expect(issues).toContain("Try/catch node tc_1 has invalid config");
  });
});
