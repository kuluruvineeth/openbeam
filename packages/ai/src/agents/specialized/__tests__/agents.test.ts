import { describe, expect, it } from "bun:test";
import {
  analystAgent,
  analystAgentConfig,
  driveAnalystConfig,
  multiSourceAnalystAgent,
  multiSourceAnalystConfig,
  notionAnalystConfig,
  slackAnalystConfig,
} from "../analyst";
import {
  coderAgent,
  coderAgentConfig,
  codeWithReviewAgent,
  codeWithReviewConfig,
  reviewerAgent,
  reviewerAgentConfig,
} from "../coder";
import {
  deepResearchAgent,
  deepResearchAgentConfig,
  researchAgent,
  researchAgentConfig,
} from "../research";
import {
  qualityWriterAgent,
  qualityWriterConfig,
  writerAgent,
  writerAgentConfig,
} from "../writer";

describe("Research Agent", () => {
  describe("researchAgentConfig", () => {
    it("has correct type", () => {
      expect(researchAgentConfig.type).toBe("llm");
    });

    it("has name and description", () => {
      expect(researchAgentConfig.name).toBe("research");
      expect(researchAgentConfig.description).toContain("Research");
    });

    it("includes search and rag tools", () => {
      const tools = researchAgentConfig.tools ?? [];
      expect(tools).toContain("search_hybrid");
      expect(tools).toContain("search_semantic");
      expect(tools).toContain("rag_answer");
    });

    it("has system prompt", () => {
      expect(researchAgentConfig.systemPrompt).toBeDefined();
      expect(researchAgentConfig.systemPrompt?.length).toBeGreaterThan(100);
    });

    it("has reasonable maxSteps", () => {
      expect(researchAgentConfig.maxSteps).toBeGreaterThan(5);
      expect(researchAgentConfig.maxSteps).toBeLessThanOrEqual(20);
    });
  });

  describe("researchAgent", () => {
    it("is created from config", () => {
      expect(researchAgent).toBeDefined();
      expect(researchAgent.config.name).toBe("research");
    });
  });

  describe("deepResearchAgentConfig", () => {
    it("is loop type for iterative research", () => {
      expect(deepResearchAgentConfig.type).toBe("loop");
    });

    it("has name and description", () => {
      expect(deepResearchAgentConfig.name).toBe("deep-research");
      expect(deepResearchAgentConfig.description).toContain("research");
    });

    it("has maxIterations", () => {
      expect(deepResearchAgentConfig.maxIterations).toBeGreaterThan(1);
      expect(deepResearchAgentConfig.maxIterations).toBeLessThanOrEqual(10);
    });

    it("has stop condition", () => {
      expect(deepResearchAgentConfig.stopCondition).toBeDefined();
    });
  });

  describe("deepResearchAgent", () => {
    it("is created from config", () => {
      expect(deepResearchAgent).toBeDefined();
    });
  });
});

describe("Writer Agent", () => {
  describe("writerAgentConfig", () => {
    it("has correct type", () => {
      expect(writerAgentConfig.type).toBe("llm");
    });

    it("has name and description", () => {
      expect(writerAgentConfig.name).toBe("writer");
      expect(writerAgentConfig.description).toContain("writing");
    });

    it("includes document tools", () => {
      const tools = writerAgentConfig.tools ?? [];
      expect(tools).toContain("doc_get");
      expect(tools).toContain("rag_answer");
    });

    it("has system prompt", () => {
      expect(writerAgentConfig.systemPrompt).toBeDefined();
    });
  });

  describe("writerAgent", () => {
    it("is created from config", () => {
      expect(writerAgent).toBeDefined();
      expect(writerAgent.config.name).toBe("writer");
    });
  });

  describe("qualityWriterConfig", () => {
    it("has generator-critic pattern", () => {
      expect(qualityWriterConfig.generator).toBeDefined();
      expect(qualityWriterConfig.critic).toBeDefined();
    });

    it("has quality threshold", () => {
      expect(qualityWriterConfig.qualityThreshold).toBeGreaterThan(0);
      expect(qualityWriterConfig.qualityThreshold).toBeLessThanOrEqual(1);
    });

    it("has maxIterations", () => {
      expect(qualityWriterConfig.maxIterations).toBeGreaterThan(1);
    });
  });

  describe("qualityWriterAgent", () => {
    it("is created from config", () => {
      expect(qualityWriterAgent).toBeDefined();
    });
  });
});

describe("Coder Agent", () => {
  describe("coderAgentConfig", () => {
    it("has correct type", () => {
      expect(coderAgentConfig.type).toBe("llm");
    });

    it("has name and description", () => {
      expect(coderAgentConfig.name).toBe("coder");
      expect(coderAgentConfig.description).toContain("Code");
    });

    it("includes data tools", () => {
      const tools = coderAgentConfig.tools ?? [];
      expect(tools).toContain("search_hybrid");
      expect(tools).toContain("doc_chunks");
    });

    it("has system prompt", () => {
      expect(coderAgentConfig.systemPrompt).toBeDefined();
    });
  });

  describe("coderAgent", () => {
    it("is created from config", () => {
      expect(coderAgent).toBeDefined();
      expect(coderAgent.config.name).toBe("coder");
    });
  });

  describe("reviewerAgentConfig", () => {
    it("has correct type", () => {
      expect(reviewerAgentConfig.type).toBe("llm");
    });

    it("has name and description", () => {
      expect(reviewerAgentConfig.name).toBe("reviewer");
      expect(reviewerAgentConfig.description).toContain("review");
    });

    it("has system prompt", () => {
      expect(reviewerAgentConfig.systemPrompt).toBeDefined();
    });
  });

  describe("reviewerAgent", () => {
    it("is created from config", () => {
      expect(reviewerAgent).toBeDefined();
      expect(reviewerAgent.config.name).toBe("reviewer");
    });
  });

  describe("codeWithReviewConfig", () => {
    it("is sequential type", () => {
      expect(codeWithReviewConfig.type).toBe("sequential");
    });

    it("has both coder and reviewer subAgents", () => {
      expect(codeWithReviewConfig.subAgents).toHaveLength(2);
    });

    it("runs coder first then reviewer", () => {
      const [first, second] = codeWithReviewConfig.subAgents;
      expect(first?.name).toBe("coder");
      expect(second?.name).toBe("reviewer");
    });
  });

  describe("codeWithReviewAgent", () => {
    it("is created from config", () => {
      expect(codeWithReviewAgent).toBeDefined();
    });
  });
});

describe("Analyst Agent", () => {
  describe("analystAgentConfig", () => {
    it("has correct type", () => {
      expect(analystAgentConfig.type).toBe("llm");
    });

    it("has name and description", () => {
      expect(analystAgentConfig.name).toBe("analyst");
      expect(analystAgentConfig.description).toContain("analysis");
    });

    it("includes analysis tools", () => {
      const tools = analystAgentConfig.tools ?? [];
      expect(tools).toContain("data_transform");
      expect(tools).toContain("data_aggregate");
      expect(tools).toContain("rag_analyze");
    });

    it("has low temperature for consistency", () => {
      expect(analystAgentConfig.model?.temperature).toBeLessThanOrEqual(0.5);
    });

    it("has system prompt", () => {
      expect(analystAgentConfig.systemPrompt).toBeDefined();
    });
  });

  describe("analystAgent", () => {
    it("is created from config", () => {
      expect(analystAgent).toBeDefined();
      expect(analystAgent.config.name).toBe("analyst");
    });
  });

  describe("source-specific analysts", () => {
    it("creates slackAnalystConfig", () => {
      expect(slackAnalystConfig.name).toBe("Slack-analyst");
      expect(slackAnalystConfig.systemPrompt).toContain("Slack");
    });

    it("creates notionAnalystConfig", () => {
      expect(notionAnalystConfig.name).toBe("Notion-analyst");
      expect(notionAnalystConfig.systemPrompt).toContain("Notion");
    });

    it("creates driveAnalystConfig", () => {
      expect(driveAnalystConfig.name).toBe("Google Drive-analyst");
      expect(driveAnalystConfig.systemPrompt).toContain("Google Drive");
    });
  });

  describe("multiSourceAnalystConfig", () => {
    it("is parallel type", () => {
      expect(multiSourceAnalystConfig.type).toBe("parallel");
    });

    it("has three source-specific subAgents", () => {
      expect(multiSourceAnalystConfig.subAgents).toHaveLength(3);
    });

    it("has merge aggregator", () => {
      expect(multiSourceAnalystConfig.aggregator?.strategy).toBe("merge");
    });
  });

  describe("multiSourceAnalystAgent", () => {
    it("is created from config", () => {
      expect(multiSourceAnalystAgent).toBeDefined();
    });
  });
});

describe("Agent Configuration Validation", () => {
  const allLlmConfigs = [
    researchAgentConfig,
    writerAgentConfig,
    coderAgentConfig,
    reviewerAgentConfig,
    analystAgentConfig,
  ];

  it.each(allLlmConfigs)("$name has required fields", (config) => {
    expect(config.type).toBe("llm");
    expect(config.name).toBeDefined();
    expect(config.description).toBeDefined();
    expect(config.systemPrompt).toBeDefined();
  });

  it.each(allLlmConfigs)("$name has valid tool references", (config) => {
    const tools = config.tools ?? [];
    for (const tool of tools) {
      expect(typeof tool).toBe("string");
      expect(tool.length).toBeGreaterThan(0);
    }
  });

  it.each(allLlmConfigs)("$name has valid maxSteps if specified", (config) => {
    if (config.maxSteps !== undefined) {
      expect(config.maxSteps).toBeGreaterThan(0);
      expect(config.maxSteps).toBeLessThanOrEqual(50);
    }
  });
});
