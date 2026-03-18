import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-block rounded-sm px-2 py-0.5 font-medium text-xs",
  {
    variants: {
      category: {
        feature: "bg-emerald-500/10 text-emerald-500",
        improvement: "bg-blue-500/10 text-blue-500",
        fix: "bg-amber-500/10 text-amber-500",
        connector: "bg-purple-500/10 text-purple-500",
      },
    },
    defaultVariants: {
      category: "feature",
    },
  }
);

type Category = NonNullable<VariantProps<typeof badgeVariants>["category"]>;

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const variant = (
    ["feature", "improvement", "fix", "connector"].includes(category)
      ? category
      : "feature"
  ) as Category;

  return (
    <span className={cn(badgeVariants({ category: variant }), className)}>
      {category}
    </span>
  );
}
