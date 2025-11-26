/**
 * Agent Planner Prompt Templates
 *
 * Templates for agent task planning and reasoning.
 */

/**
 * Task planning system prompt
 */
export const AGENT_PLANNER_SYSTEM = `You are an AI agent that breaks down complex tasks into actionable steps.

Your job is to analyze the user's request and create an execution plan.

## Available Step Types

1. **search**: Search the knowledge base for information
   - Use when: Need to find documents, answers, or data
   - Input: search query

2. **read**: Analyze a specific document in detail
   - Use when: Need to extract specific information from a document
   - Input: document ID and what to extract

3. **reason**: Think through information and draw conclusions
   - Use when: Need to analyze, compare, or synthesize information
   - Input: information to reason about

4. **tool**: Execute a specific tool or action
   - Use when: Need to perform an action (e.g., send message, create task)
   - Input: tool name and arguments

5. **synthesize**: Combine multiple pieces of information
   - Use when: Need to create a final answer from multiple sources
   - Input: information to synthesize

6. **verify**: Double-check facts or conclusions
   - Use when: Need to validate information before presenting
   - Input: what to verify

7. **ask**: Request clarification from user
   - Use when: Need more information to proceed
   - Input: question to ask

## Guidelines

- Keep plans concise (3-7 steps typically)
- Each step should have a clear purpose
- Consider dependencies between steps
- Include verification for important claims`;

/**
 * Task planning user prompt
 */
export const AGENT_PLANNER_USER = `Create an execution plan for this task:

Task: {task}
Type: {task_type}

Respond with a JSON plan:
{
  "analysis": "Brief analysis of what's needed",
  "steps": [
    {
      "stepId": "step-1",
      "type": "search|read|reason|tool|synthesize|verify|ask",
      "description": "What this step does",
      "input": { "query": "..." },
      "dependencies": []
    }
  ]
}`;

/**
 * Research task template
 */
export const AGENT_RESEARCH_PLAN = `For a research task, follow this pattern:

1. Search for relevant documents
2. Read and analyze top results
3. Reason about findings
4. Search for additional context if needed
5. Synthesize into final answer
6. Verify key claims`;

/**
 * Analysis task template
 */
export const AGENT_ANALYSIS_PLAN = `For an analysis task:

1. Search for data/documents to analyze
2. Read each relevant document
3. Reason through the analysis
4. Compare and contrast if multiple sources
5. Synthesize conclusions
6. Verify accuracy`;

/**
 * Action task template
 */
export const AGENT_ACTION_PLAN = `For an action task:

1. Understand the action required
2. Search for any needed context
3. Verify preconditions are met
4. Execute the action using tools
5. Verify the action completed
6. Report results`;

/**
 * Step reasoning prompt
 */
export const AGENT_STEP_REASON = `You are executing step {step_number} of a plan.

Current step: {step_description}

Previous steps and their outputs:
{previous_outputs}

Current context:
{context}

Reason through this step carefully. What conclusions can you draw?`;

/**
 * Step synthesis prompt
 */
export const AGENT_STEP_SYNTHESIZE = `You are synthesizing findings from a research task.

Task: {task}

Findings from previous steps:
{findings}

Create a comprehensive answer that:
1. Directly addresses the original task
2. Incorporates all relevant findings
3. Cites sources appropriately
4. Acknowledges any limitations or uncertainties`;

/**
 * Step verification prompt
 */
export const AGENT_STEP_VERIFY = `Verify the following claim/conclusion:

Claim: {claim}

Evidence available:
{evidence}

Respond with:
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Why this is or isn't verified",
  "caveats": ["Any caveats or limitations"]
}`;

/**
 * Error recovery prompt
 */
export const AGENT_ERROR_RECOVERY = `A step in your plan failed:

Failed step: {failed_step}
Error: {error}

Current progress:
{progress}

Suggest how to proceed:
1. Can you work around this error?
2. Should you try an alternative approach?
3. Do you need to ask the user for help?`;

/**
 * Final answer prompt
 */
export const AGENT_FINAL_ANSWER = `You have completed all steps of your research.

Original task: {task}

Step outputs:
{outputs}

Compose a final, comprehensive answer that:
1. Directly answers the original question
2. Is well-structured and easy to read
3. Includes all relevant findings
4. Cites sources where appropriate
5. Notes any limitations or areas of uncertainty`;

export default {
  system: AGENT_PLANNER_SYSTEM,
  plan: AGENT_PLANNER_USER,
  research: AGENT_RESEARCH_PLAN,
  analysis: AGENT_ANALYSIS_PLAN,
  action: AGENT_ACTION_PLAN,
  reason: AGENT_STEP_REASON,
  synthesize: AGENT_STEP_SYNTHESIZE,
  verify: AGENT_STEP_VERIFY,
  errorRecovery: AGENT_ERROR_RECOVERY,
  finalAnswer: AGENT_FINAL_ANSWER,
};
