import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  Cancel01Icon,
  FlowSquareIcon,
  FullScreenIcon,
  GitBranchIcon,
  Mail01Icon,
  MessageIcon,
  MinimizeScreenIcon,
  RocketIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import type { ComponentProps, SVGProps } from "react";

type HugeiconsIconProps = ComponentProps<typeof HugeiconsIcon>;
type IconType = HugeiconsIconProps["icon"];

type IconWrapperProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const createIcon =
  (Icon: IconType): ((props: IconWrapperProps) => React.ReactElement) =>
  ({ size = 16 }: IconWrapperProps) => {
    const iconSize = typeof size === "number" ? size : 16;
    return (
      <HugeiconsIcon
        color="currentColor"
        icon={Icon}
        size={iconSize}
        strokeWidth={1.5}
      />
    );
  };

export const Icons = {
  Search: createIcon(SearchIcon),
  Sparkles: createIcon(SparklesIcon),
  Message: createIcon(MessageIcon),
  Mail: createIcon(Mail01Icon),
  BookOpen: createIcon(BookOpen01Icon),
  GitBranch: createIcon(GitBranchIcon),
  Connector: createIcon(FlowSquareIcon),
  Settings: createIcon(SettingsIcon),
  Shield: createIcon(ShieldIcon),
  Rocket: createIcon(RocketIcon),
  Close: createIcon(Cancel01Icon),
  Fullscreen: createIcon(FullScreenIcon),
  ExitFullscreen: createIcon(MinimizeScreenIcon),
};
