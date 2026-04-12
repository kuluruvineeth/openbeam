import type { OnboardingState } from "@openbeam/types/bot";

interface MilestoneCheck {
  field: string;
  condition: (state: OnboardingState) => boolean;
  message: string;
}

const MILESTONES: MilestoneCheck[] = [
  {
    field: "milestoneFirstAction",
    condition: (s) => s.queryCount === 1,
    message: "First search done. You're off.",
  },
  {
    field: "milestoneFiftyQueries",
    condition: (s) => s.queryCount >= 50,
    message: "50 searches. You're in the top 10% of your team.",
  },
  {
    field: "milestoneWeekStreak",
    condition: (s) => s.streakDays >= 7,
    message: "7 days in a row. Your team's data is working for you.",
  },
  {
    field: "milestoneMonthStreak",
    condition: (s) => s.streakDays >= 30,
    message: "A month of daily use. Power user.",
  },
];

export function checkMilestones(
  state: OnboardingState,
  achievedMilestones: Set<string>
): string | null {
  for (const milestone of MILESTONES) {
    if (achievedMilestones.has(milestone.field)) {
      continue;
    }
    if (milestone.condition(state)) {
      return milestone.message;
    }
  }
  return null;
}

export function updateStreak(
  currentStreakDays: number,
  lastStreakDate: string | null
): { streakDays: number; lastStreakDate: string } {
  const today = new Date().toISOString().slice(0, 10);

  if (lastStreakDate === today) {
    return { streakDays: currentStreakDays, lastStreakDate: today };
  }

  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);

  if (lastStreakDate === yesterday) {
    return { streakDays: currentStreakDays + 1, lastStreakDate: today };
  }

  return { streakDays: 1, lastStreakDate: today };
}
