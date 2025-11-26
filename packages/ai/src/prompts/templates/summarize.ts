/**
 * Summarization Prompt Templates
 *
 * Templates for various summarization tasks.
 */

/**
 * Document summary system prompt
 */
export const SUMMARIZE_DOCUMENT_SYSTEM = `You are an expert at summarizing documents clearly and concisely.

Instructions:
- Capture the key points and main ideas
- Maintain the essential meaning
- Use clear, professional language
- Structure the summary logically`;

/**
 * Brief summary prompt
 */
export const SUMMARIZE_BRIEF = `Summarize the following content in 2-3 sentences, capturing only the most essential points:

{content}`;

/**
 * Detailed summary prompt
 */
export const SUMMARIZE_DETAILED = `Provide a comprehensive summary of the following content. Include:
- Main topic and purpose
- Key points and arguments
- Important details and examples
- Conclusions or recommendations

Content:
{content}`;

/**
 * Bullet point summary prompt
 */
export const SUMMARIZE_BULLETS = `Summarize the following content as a bulleted list of key points. Use 5-10 bullets maximum:

{content}`;

/**
 * Executive summary prompt
 */
export const SUMMARIZE_EXECUTIVE = `Create an executive summary of the following content. This should be suitable for busy decision-makers who need the key takeaways quickly:

{content}

Format:
- **Key Takeaway**: One sentence summary
- **Main Points**: 3-5 bullet points
- **Recommendation/Next Steps**: If applicable`;

/**
 * Thread summary prompt (for Slack/email threads)
 */
export const SUMMARIZE_THREAD = `Summarize this conversation thread:

{content}

Include:
1. Main topic discussed
2. Key decisions or conclusions
3. Action items mentioned
4. Unresolved questions`;

/**
 * Meeting notes summary
 */
export const SUMMARIZE_MEETING = `Create structured meeting notes from this content:

{content}

Format:
## Meeting Summary
[Brief overview]

## Key Discussion Points
- Point 1
- Point 2
...

## Decisions Made
- Decision 1
- Decision 2
...

## Action Items
- [ ] Action 1 (Owner)
- [ ] Action 2 (Owner)
...

## Next Steps
[What happens next]`;

/**
 * Multi-document summary prompt
 */
export const SUMMARIZE_MULTIPLE = `Synthesize and summarize the following {count} documents:

{documents}

Create a unified summary that:
1. Identifies common themes
2. Highlights key differences or conflicts
3. Provides an overall picture of the topic`;

/**
 * Changelog/diff summary prompt
 */
export const SUMMARIZE_CHANGES = `Summarize the changes between these versions:

Previous:
{previous}

Current:
{current}

List:
- What was added
- What was removed
- What was modified`;

/**
 * Technical document summary
 */
export const SUMMARIZE_TECHNICAL = `Create a technical summary of this documentation:

{content}

Include:
- Purpose/functionality described
- Key technical details
- Dependencies or requirements
- Usage examples if present`;

export default {
  system: SUMMARIZE_DOCUMENT_SYSTEM,
  brief: SUMMARIZE_BRIEF,
  detailed: SUMMARIZE_DETAILED,
  bullets: SUMMARIZE_BULLETS,
  executive: SUMMARIZE_EXECUTIVE,
  thread: SUMMARIZE_THREAD,
  meeting: SUMMARIZE_MEETING,
  multiple: SUMMARIZE_MULTIPLE,
  changes: SUMMARIZE_CHANGES,
  technical: SUMMARIZE_TECHNICAL,
};
