"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AddIcon,
  Alert01Icon,
  Alert02Icon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  AtomIcon,
  Attachment01Icon,
  AudioWaveIcon,
  BookIcon,
  BookOpen01Icon,
  BrainIcon,
  Calendar01Icon,
  Cancel01Icon,
  ChatGptIcon,
  CheckmarkCircle01Icon,
  ClaudeIcon,
  ClockIcon,
  Comment01Icon,
  Copy01Icon,
  CursorPointer01Icon,
  DatabaseIcon,
  Delete01Icon,
  DocumentCodeIcon,
  Download01Icon,
  FavouriteIcon,
  File01Icon,
  FileAudioIcon,
  FilePasteIcon,
  FileVideoIcon,
  FileZipIcon,
  FilterIcon,
  FlashIcon,
  FlowIcon,
  FlowSquareIcon,
  FolderIcon,
  FullScreenIcon,
  GitBranchIcon,
  GitForkIcon,
  GitMergeIcon,
  GlobeIcon,
  GoogleGeminiIcon,
  GridIcon,
  HandGripIcon,
  HelpCircleIcon,
  ImageIcon,
  InfinityIcon,
  InformationCircleIcon,
  LinkIcon,
  Loading01Icon,
  LoadingIcon,
  LockIcon,
  Mail01Icon,
  Maximize01Icon,
  Menu01Icon,
  Message01Icon,
  MessageIcon,
  MinimizeScreenIcon,
  MinusSignIcon,
  Move01Icon,
  MusicNote01Icon,
  Note01Icon,
  Notification01Icon,
  PauseIcon,
  Pdf01Icon,
  PencilEdit01Icon,
  PinIcon,
  PlayIcon,
  PlugIcon,
  PresentationIcon,
  RedoIcon,
  RefreshIcon,
  RepeatIcon,
  RobotIcon,
  Scissor01Icon,
  SearchIcon,
  Settings02Icon,
  SettingsIcon,
  ShieldIcon,
  SidebarRightIcon,
  SourceCodeIcon,
  SparklesIcon,
  SquareIcon,
  SquareUnlock01Icon,
  TableIcon,
  TagsIcon,
  Target01Icon,
  TextIcon,
  TickIcon,
  ToolsIcon,
  UndoIcon,
  Upload01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  UserIcon,
  Video01Icon,
  ViewIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
  WebhookIcon,
  Wrench01Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  Circle as LucideCircle,
  MoreHorizontal as LucideMoreHorizontal,
} from "lucide-react";
import type React from "react";
import type { ComponentProps, SVGProps } from "react";

type HugeiconsIconProps = ComponentProps<typeof HugeiconsIcon>;
type IconType = HugeiconsIconProps["icon"];

type IconWrapperProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const createIcon =
  (Icon: IconType): ((props: IconWrapperProps) => React.ReactElement) =>
  ({ size = 20, strokeWidth, ...restProps }: IconWrapperProps) => {
    const iconSize = typeof size === "number" ? size : 20;
    return (
      <HugeiconsIcon
        color="currentColor"
        icon={Icon}
        size={iconSize}
        strokeWidth={1.5}
        {...restProps}
      />
    );
  };

export const Icons = {
  Google: (props: SVGProps<SVGSVGElement>) => (
    // biome-ignore lint/a11y/noSvgWithoutTitle: This is a Google icon
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#a)">
        <path
          d="M10 3.958c1.475 0 2.796.509 3.838 1.5l2.854-2.854C14.959.992 12.696 0 10 0a9.995 9.995 0 0 0-8.933 5.508l3.325 2.58c.787-2.371 3-4.13 5.608-4.13Z"
          fill="#585858"
        />
        <path
          d="M19.575 10.23c0-.655-.063-1.288-.158-1.897H10v3.759h5.392a4.648 4.648 0 0 1-1.992 2.991l3.22 2.5c1.88-1.741 2.955-4.316 2.955-7.354Z"
          fill="#878787"
        />
        <path
          d="M4.388 11.912A6.075 6.075 0 0 1 4.07 10c0-.667.112-1.308.317-1.913L1.063 5.508A9.964 9.964 0 0 0 0 10c0 1.617.383 3.142 1.067 4.492l3.32-2.58Z"
          fill="#D7D7D7"
        />
        <path
          d="M10 20c2.7 0 4.97-.887 6.62-2.42l-3.22-2.5c-.896.603-2.05.958-3.4.958-2.608 0-4.82-1.759-5.612-4.13l-3.325 2.58C2.712 17.758 6.091 20 10 20Z"
          fill="#B3B3B3"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path d="M0 0h20v20H0z" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  ),
  Plus: createIcon(AddIcon),
  History: createIcon(ClockIcon),
  Workflow: createIcon(FlowIcon),
  Messages: createIcon(MessageIcon),
  Agents: createIcon(RobotIcon),
  Integrations: createIcon(PlugIcon),
  Plug: createIcon(PlugIcon),
  KnowledgeManagement: createIcon(BookIcon),
  Settings: createIcon(SettingsIcon),
  ChevronDown: createIcon(ArrowDownIcon),
  Sparkle: createIcon(SparklesIcon),
  Search: createIcon(SearchIcon),
  ArrowRight: createIcon(ArrowRightIcon),
  ArrowLeft: createIcon(ArrowLeftIcon),
  Close: createIcon(Cancel01Icon),
  ArrowRightIcon: createIcon(ArrowRightIcon),
  ChevronDownIcon: createIcon(ArrowDownIcon),
  InfinityIcon: createIcon(InfinityIcon),
  AtomIcon: createIcon(AtomIcon),
  BrainIcon: createIcon(BrainIcon),
  GlobeIcon: createIcon(GlobeIcon),
  GavelIcon: createIcon(ToolsIcon),
  SquareIcon: createIcon(SquareIcon),
  Loader2Icon: createIcon(LoadingIcon),
  FileIcon: createIcon(File01Icon),
  FileTextIcon: createIcon(DocumentCodeIcon),
  FileSpreadsheetIcon: createIcon(TableIcon),
  PresentationIcon: createIcon(PresentationIcon),
  FileImageIcon: createIcon(ImageIcon),
  FilePdf: createIcon(Pdf01Icon),
  FileAudio: createIcon(FileAudioIcon),
  FileVideo: createIcon(FileVideoIcon),
  FileCode: createIcon(SourceCodeIcon),
  FileArchive: createIcon(FileZipIcon),
  Video: createIcon(Video01Icon),
  Music: createIcon(MusicNote01Icon),
  XIcon: createIcon(Cancel01Icon),
  CheckIcon: createIcon(TickIcon),
  SearchIcon: createIcon(SearchIcon),
  LinkIcon: createIcon(LinkIcon),
  BotIcon: createIcon(RobotIcon),
  LockIcon: createIcon(LockIcon),
  ShieldIcon: createIcon(ShieldIcon),
  InfoIcon: createIcon(InformationCircleIcon),
  ConnectorIcon: createIcon(FlowSquareIcon),
  ChatGptIcon: createIcon(ChatGptIcon),
  GoogleGeminiIcon: createIcon(GoogleGeminiIcon),
  ClaudeIcon: createIcon(ClaudeIcon),
  RefreshCw: createIcon(RefreshIcon),
  Database: createIcon(DatabaseIcon),
  Webhook: createIcon(WebhookIcon),
  AlertCircle: createIcon(Alert01Icon),
  CheckCircle2: createIcon(CheckmarkCircle01Icon),
  Info: createIcon(InformationCircleIcon),
  Spinner: createIcon(Loading01Icon),
  Folder: createIcon(FolderIcon),
  Message: createIcon(MessageIcon),
  Comment: createIcon(Comment01Icon),
  Attachment: createIcon(Attachment01Icon),
  Heart: createIcon(FavouriteIcon),
  Mail: createIcon(Mail01Icon),
  Calendar: createIcon(Calendar01Icon),
  User: createIcon(UserIcon),
  GitBranch: createIcon(GitBranchIcon),
  Hash: createIcon(GridIcon),
  ExternalLink: createIcon(ArrowUpRightIcon),
  Task: createIcon(CheckmarkCircle01Icon),
  Clock: createIcon(ClockIcon),
  Minus: createIcon(MinusSignIcon),
  ChevronLeft: createIcon(ArrowLeftIcon),
  ChevronRight: createIcon(ArrowRightIcon),
  Eye: createIcon(ViewIcon),
  Copy: createIcon(Copy01Icon),
  Check: createIcon(TickIcon),
  Play: createIcon(PlayIcon),
  Pause: createIcon(PauseIcon),
  VolumeHigh: createIcon(VolumeHighIcon),
  VolumeMute: createIcon(VolumeMute01Icon),
  Fullscreen: createIcon(FullScreenIcon),
  ExitFullscreen: createIcon(MinimizeScreenIcon),
  SidebarRight: createIcon(SidebarRightIcon),
  BookOpen: createIcon(BookOpen01Icon),
  Text: createIcon(TextIcon),
  Pin: createIcon(PinIcon),
  Menu: createIcon(Menu01Icon),
  ChevronUp: createIcon(ArrowUpIcon),
  SparklesIcon: createIcon(SparklesIcon),
  Alert02: createIcon(Alert02Icon),
  Trash: createIcon(Delete01Icon),
  Delete: createIcon(Delete01Icon),
  ZoomIn: createIcon(AddIcon),
  ZoomOut: createIcon(MinusSignIcon),
  Pointer: createIcon(CursorPointer01Icon),
  Hand: createIcon(HandGripIcon),
  Move: createIcon(Move01Icon),
  Unlock: createIcon(SquareUnlock01Icon),
  AudioWave: createIcon(AudioWaveIcon),
  Code: createIcon(SourceCodeIcon),
  Image: createIcon(ImageIcon),
  Filter: createIcon(FilterIcon),
  Repeat: createIcon(RepeatIcon),
  Tags: createIcon(TagsIcon),
  Note: createIcon(Note01Icon),
  MessageSquare: createIcon(Message01Icon),
  GitMerge: createIcon(GitMergeIcon),
  Pencil: createIcon(PencilEdit01Icon),
  HelpCircle: createIcon(HelpCircleIcon),
  Settings2: createIcon(Settings02Icon),
  Wrench: createIcon(Wrench01Icon),
  Zap: createIcon(FlashIcon),
  Bell: createIcon(Notification01Icon),
  UserCheck: createIcon(UserCheck01Icon),
  Crosshair: createIcon(Target01Icon),
  Download: createIcon(Download01Icon),
  Upload: createIcon(Upload01Icon),
  GitFork: createIcon(GitForkIcon),
  Braces: createIcon(SourceCodeIcon),
  Maximize: createIcon(Maximize01Icon),
  Redo: createIcon(RedoIcon),
  Undo: createIcon(UndoIcon),
  Users: createIcon(UserGroupIcon),
  Scissors: createIcon(Scissor01Icon),
  Paste: createIcon(FilePasteIcon),
  Circle: LucideCircle,
  MoreHorizontal: LucideMoreHorizontal,
};

export type { IconWrapperProps };
