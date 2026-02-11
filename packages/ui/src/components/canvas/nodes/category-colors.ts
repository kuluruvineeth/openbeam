import type { NodeCategory } from "@openplane/types/canvas";

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  control: "hsl(220 70% 50%)",
  ai: "hsl(262 83% 58%)",
  transform: "hsl(24 95% 53%)",
  integration: "hsl(142 71% 45%)",
  human: "hsl(45 93% 47%)",
  trigger: "hsl(330 81% 60%)",
  memory: "hsl(192 91% 36%)",
  orchestration: "hsl(280 65% 60%)",
};
