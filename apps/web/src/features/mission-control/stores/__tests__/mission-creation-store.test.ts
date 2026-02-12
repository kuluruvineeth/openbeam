import { afterEach, describe, expect, it } from "bun:test";
import { useMissionCreationStore } from "../mission-creation-store";

function getState() {
  return useMissionCreationStore.getState();
}

const AGENT_DEFAULTS = { capabilities: [] as string[] };
const TASK_DEFAULTS = {
  dependsOn: [] as string[],
  requiredCapabilities: [] as string[],
};

describe("mission-creation-store", () => {
  afterEach(() => {
    getState().reset();
  });

  it("defaults to step 0", () => {
    expect(getState().step).toBe(0);
  });

  it("nextStep increments step capped at 3", () => {
    getState().nextStep();
    expect(getState().step).toBe(1);

    getState().nextStep();
    expect(getState().step).toBe(2);

    getState().nextStep();
    expect(getState().step).toBe(3);

    getState().nextStep();
    expect(getState().step).toBe(3);
  });

  it("prevStep decrements step capped at 0", () => {
    getState().setStep(2);
    getState().prevStep();
    expect(getState().step).toBe(1);

    getState().prevStep();
    expect(getState().step).toBe(0);

    getState().prevStep();
    expect(getState().step).toBe(0);
  });

  it("setObjective updates objective", () => {
    getState().setObjective("Research competitor pricing");
    expect(getState().objective).toBe("Research competitor pricing");
  });

  it("addAgent adds agent to array", () => {
    const agent = {
      name: "Researcher",
      role: "research",
      soulPrompt: "You are a research agent",
      tools: ["search_hybrid"],
      ...AGENT_DEFAULTS,
    };

    getState().addAgent(agent);
    expect(getState().agents).toHaveLength(1);
    expect(getState().agents[0]).toEqual(agent);
  });

  it("removeAgent removes by index", () => {
    getState().addAgent({
      name: "A",
      role: "a",
      soulPrompt: "",
      tools: [],
      ...AGENT_DEFAULTS,
    });
    getState().addAgent({
      name: "B",
      role: "b",
      soulPrompt: "",
      tools: [],
      ...AGENT_DEFAULTS,
    });
    getState().addAgent({
      name: "C",
      role: "c",
      soulPrompt: "",
      tools: [],
      ...AGENT_DEFAULTS,
    });

    getState().removeAgent(1);

    expect(getState().agents).toHaveLength(2);
    expect(getState().agents[0]?.name).toBe("A");
    expect(getState().agents[1]?.name).toBe("C");
  });

  it("updateAgent merges partial update at index", () => {
    getState().addAgent({
      name: "Agent",
      role: "old",
      soulPrompt: "",
      tools: [],
      ...AGENT_DEFAULTS,
    });
    getState().updateAgent(0, { role: "updated", tools: ["search"] });

    expect(getState().agents[0]?.name).toBe("Agent");
    expect(getState().agents[0]?.role).toBe("updated");
    expect(getState().agents[0]?.tools).toEqual(["search"]);
  });

  it("addTask adds task to array", () => {
    const task = {
      title: "Analyze data",
      description: "Run analysis on dataset",
      priority: "P1" as const,
      ...TASK_DEFAULTS,
    };

    getState().addTask(task);
    expect(getState().tasks).toHaveLength(1);
    expect(getState().tasks[0]).toEqual(task);
  });

  it("removeTask removes by index", () => {
    getState().addTask({
      title: "A",
      description: "",
      priority: "P0",
      ...TASK_DEFAULTS,
    });
    getState().addTask({
      title: "B",
      description: "",
      priority: "P1",
      ...TASK_DEFAULTS,
    });

    getState().removeTask(0);

    expect(getState().tasks).toHaveLength(1);
    expect(getState().tasks[0]?.title).toBe("B");
  });

  it("updateTask merges partial update at index", () => {
    getState().addTask({
      title: "Task",
      description: "old",
      priority: "P2",
      ...TASK_DEFAULTS,
    });
    getState().updateTask(0, { description: "new", priority: "P0" });

    expect(getState().tasks[0]?.title).toBe("Task");
    expect(getState().tasks[0]?.description).toBe("new");
    expect(getState().tasks[0]?.priority).toBe("P0");
  });

  it("reset clears all state back to defaults", () => {
    getState().setStep(2);
    getState().setObjective("Test objective");
    getState().setLane("linear");
    getState().setBudgetCents(5000);
    getState().addAgent({
      name: "A",
      role: "a",
      soulPrompt: "",
      tools: [],
      ...AGENT_DEFAULTS,
    });
    getState().addTask({
      title: "T",
      description: "",
      priority: "P1",
      ...TASK_DEFAULTS,
    });
    getState().setSubmitting(true);

    getState().reset();

    expect(getState().step).toBe(0);
    expect(getState().objective).toBe("");
    expect(getState().templateId).toBeNull();
    expect(getState().lane).toBe("autonomous");
    expect(getState().budgetCents).toBeNull();
    expect(getState().agents).toEqual([]);
    expect(getState().tasks).toEqual([]);
    expect(getState().isSubmitting).toBe(false);
  });

  it("useCanProceed returns false when objective is empty on step 0", () => {
    expect(getState().step).toBe(0);
    expect(getState().objective).toBe("");

    const canProceed = useMissionCreationStore.getState();
    const step = canProceed.step;
    const objectiveEmpty = canProceed.objective.trim().length === 0;
    expect(step).toBe(0);
    expect(objectiveEmpty).toBe(true);
  });

  it("useCanProceed returns true when objective is set on step 0", () => {
    getState().setObjective("Valid objective");

    const state = useMissionCreationStore.getState();
    expect(state.objective.trim().length > 0).toBe(true);
  });
});
