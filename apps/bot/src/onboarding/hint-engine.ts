import type { CapabilityHint, OnboardingState } from "@openbeam/types/bot";
import { isHintShown } from "./cache";
import { CAPABILITY_HINTS } from "./capabilities";

interface HintContext {
  teamId: string;
  userId: string;
  state: OnboardingState;
  trigger: CapabilityHint["trigger"];
  resultCount?: number;
  isRepeatedQuery?: boolean;
}

export async function evaluateHints(
  ctx: HintContext
): Promise<CapabilityHint | null> {
  const eligible = CAPABILITY_HINTS.filter(
    (hint) =>
      hint.trigger === ctx.trigger && hint.stages.includes(ctx.state.stage)
  );

  for (const hint of eligible) {
    if (hint.trigger === "post_zero_results" && ctx.resultCount !== 0) {
      continue;
    }
    if (hint.trigger === "repeated_query" && !ctx.isRepeatedQuery) {
      continue;
    }

    const shown = await isHintShown(ctx.teamId, ctx.userId, hint.id);
    if (shown) {
      continue;
    }

    return hint;
  }

  return null;
}
