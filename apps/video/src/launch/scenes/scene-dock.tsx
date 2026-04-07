import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MacOSCursor } from "../demos/macos-cursor";
import { LT } from "../theme";

const ICON_SIZE = 48;
const ICON_GAP = 4;
const DOCK_PADDING_X = 10;
const DOCK_PADDING_Y = 6;
const CLAUDE_INDEX = 4;

const DOCK_APPS = [
  { id: "finder", label: "Finder", running: true },
  { id: "safari", label: "Safari", running: false },
  { id: "messages", label: "Messages", running: false },
  { id: "mail", label: "Mail", running: false },
  { id: "claude", label: "Claude", running: false },
  { id: "notes", label: "Notes", running: false },
  { id: "terminal", label: "Terminal", running: true },
  { id: "settings", label: "Settings", running: false },
] as const;

function FinderIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#4A9EF5" height="48" rx="10" width="48" />
      <rect
        fill="none"
        height="30"
        rx="4"
        stroke="white"
        strokeWidth="2"
        width="34"
        x="7"
        y="9"
      />
      <circle cx="19" cy="21" fill="white" r="2.5" />
      <circle cx="29" cy="21" fill="white" r="2.5" />
      <path
        d="M17 30 C20 34, 28 34, 31 30"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <line stroke="white" strokeWidth="1.5" x1="24" x2="24" y1="16" y2="27" />
    </svg>
  );
}

function SafariIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#2196F3" height="48" rx="10" width="48" />
      <circle
        cx="24"
        cy="24"
        fill="none"
        r="14"
        stroke="white"
        strokeWidth="1.5"
      />
      <polygon fill="white" opacity="0.9" points="24,10 28,24 24,38" />
      <polygon fill="#EF4444" opacity="0.8" points="24,10 20,24 24,38" />
      <polygon fill="white" opacity="0.9" points="10,24 24,20 38,24" />
      <polygon fill="#EF4444" opacity="0.8" points="10,24 24,28 38,24" />
      <circle cx="24" cy="24" fill="white" r="2" />
    </svg>
  );
}

function MessagesIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#34C759" height="48" rx="10" width="48" />
      <path
        d="M10 17 C10 13.7, 12.7 11, 16 11 L32 11 C35.3 11 38 13.7 38 17 L38 27 C38 30.3 35.3 33 32 33 L18 33 L13 37 L13 33 C11.3 33 10 31.3 10 29 Z"
        fill="white"
      />
    </svg>
  );
}

function MailIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#2196F3" height="48" rx="10" width="48" />
      <rect
        fill="none"
        height="22"
        rx="3"
        stroke="white"
        strokeWidth="2"
        width="30"
        x="9"
        y="13"
      />
      <path
        d="M9 15 L24 27 L39 15"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ClaudeIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      style={{ borderRadius: 10 }}
      viewBox="0 0 36 36"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#D97757" height="36" rx="8" width="36" />
      <g transform="translate(6,6) scale(1)">
        <path
          d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

function NotesIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#FBBF24" height="48" rx="10" width="48" />
      <rect fill="white" height="26" rx="2" width="24" x="12" y="11" />
      <line stroke="#D4D4D8" strokeWidth="1" x1="16" x2="32" y1="18" y2="18" />
      <line stroke="#D4D4D8" strokeWidth="1" x1="16" x2="32" y1="22" y2="22" />
      <line stroke="#D4D4D8" strokeWidth="1" x1="16" x2="32" y1="26" y2="26" />
      <line stroke="#D4D4D8" strokeWidth="1" x1="16" x2="28" y1="30" y2="30" />
    </svg>
  );
}

function TerminalIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#1C1C1E" height="48" rx="10" width="48" />
      <rect
        fill="none"
        height="4"
        rx="2"
        stroke="#3A3A3C"
        strokeWidth="1"
        width="36"
        x="6"
        y="6"
      />
      <circle cx="10" cy="8" fill="#FF5F57" r="1.5" />
      <circle cx="15" cy="8" fill="#FEBC2E" r="1.5" />
      <circle cx="20" cy="8" fill="#28C840" r="1.5" />
      <text
        fill="#22C55E"
        fontFamily="'Geist Mono', monospace"
        fontSize="14"
        fontWeight="500"
        x="12"
        y="30"
      >
        {">"}_
      </text>
    </svg>
  );
}

function SettingsIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#8E8E93" height="48" rx="10" width="48" />
      <circle
        cx="24"
        cy="24"
        fill="none"
        r="7"
        stroke="white"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="24" fill="white" r="3" />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = 24 + Math.cos(angle) * 10;
        const y1 = 24 + Math.sin(angle) * 10;
        const x2 = 24 + Math.cos(angle) * 14;
        const y2 = 24 + Math.sin(angle) * 14;
        return (
          <line
            key={i}
            stroke="white"
            strokeLinecap="round"
            strokeWidth="2.5"
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
          />
        );
      })}
    </svg>
  );
}

const ICON_COMPONENTS: Record<string, React.FC<{ size: number }>> = {
  finder: FinderIcon,
  safari: SafariIcon,
  messages: MessagesIcon,
  mail: MailIcon,
  claude: ClaudeIcon,
  notes: NotesIcon,
  terminal: TerminalIcon,
  settings: SettingsIcon,
};

function DockIcon({
  app,
  index,
  bouncing,
  showDot,
}: {
  app: (typeof DOCK_APPS)[number];
  index: number;
  bouncing: boolean;
  showDot: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const IconComponent = ICON_COMPONENTS[app.id];

  let bounceY = 0;
  if (bouncing) {
    const bounceFrame = frame - 40;
    if (bounceFrame >= 0 && bounceFrame < 24) {
      const firstBounce = spring({
        frame: bounceFrame,
        fps,
        config: { mass: 0.6, damping: 8, stiffness: 400 },
        from: 0,
        to: 1,
      });
      bounceY = interpolate(firstBounce, [0, 0.5, 1], [0, -22, 0]);
    }
  }

  const dockEntrance = spring({
    frame: frame - 10 - index * 2,
    fps,
    config: { mass: 1, damping: 20, stiffness: 200 },
    from: 0,
    to: 1,
  });

  const iconOpacity = interpolate(dockEntrance, [0, 0.5, 1], [0, 0.8, 1]);
  const iconScale = interpolate(dockEntrance, [0, 1], [0.6, 1]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        opacity: iconOpacity,
        transform: `translateY(${bounceY}px) scale(${iconScale})`,
      }}
    >
      <div
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {IconComponent ? <IconComponent size={ICON_SIZE} /> : null}
      </div>
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          background: "white",
          opacity: showDot ? 0.6 : 0,
          transition: "opacity 0.2s",
        }}
      />
    </div>
  );
}

function MenuBar() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 28,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        opacity,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <svg
          aria-hidden="true"
          fill="white"
          height="12"
          opacity="0.9"
          viewBox="0 0 17 20"
          width="10"
        >
          <path d="M12.5 0C10.8 0 9.2 1 8.5 2.5C7.8 1 6.2 0 4.5 0C2 0 0 2 0 4.5C0 9 8.5 16 8.5 16S17 9 17 4.5C17 2 15 0 12.5 0Z" />
        </svg>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 600,
            color: "white",
            opacity: 0.9,
          }}
        >
          Finder
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 400,
            color: "white",
            opacity: 0.7,
          }}
        >
          File
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 400,
            color: "white",
            opacity: 0.7,
          }}
        >
          Edit
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 400,
            color: "white",
            opacity: 0.7,
          }}
        >
          View
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 400,
            color: "white",
            opacity: 0.7,
          }}
        >
          Go
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 400,
            color: "white",
            opacity: 0.7,
          }}
        >
          Window
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 400,
            color: "white",
            opacity: 0.7,
          }}
        >
          Wed Apr 2
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: LT.font.sans,
            fontWeight: 600,
            color: "white",
            opacity: 0.8,
          }}
        >
          10:42 AM
        </span>
      </div>
    </div>
  );
}

export const SceneDock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const desktopFade = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dockWidth =
    DOCK_APPS.length * (ICON_SIZE + ICON_GAP) - ICON_GAP + DOCK_PADDING_X * 2;

  const dockEntrance = spring({
    frame: frame - 8,
    fps,
    config: { mass: 1, damping: 22, stiffness: 180 },
    from: 0,
    to: 1,
  });

  const dockY = interpolate(dockEntrance, [0, 1], [80, 0]);
  const dockOpacity = interpolate(dockEntrance, [0, 0.4, 1], [0, 0.6, 1]);

  const claudeIconCenterX =
    1920 / 2 -
    dockWidth / 2 +
    DOCK_PADDING_X +
    CLAUDE_INDEX * (ICON_SIZE + ICON_GAP) +
    ICON_SIZE / 2;
  const claudeIconCenterY = 1080 - 12 - DOCK_PADDING_Y - 8 - ICON_SIZE / 2;

  const cursorStartX = 1600;
  const cursorStartY = 900;

  const cursorProgress = interpolate(frame, [15, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  const cursorX = interpolate(
    cursorProgress,
    [0, 1],
    [cursorStartX, claudeIconCenterX - 2]
  );
  const cursorY = interpolate(
    cursorProgress,
    [0, 1],
    [cursorStartY, claudeIconCenterY]
  );

  const clickScale =
    frame >= 39 && frame <= 42
      ? interpolate(frame, [39, 40, 42], [1, 0.9, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const cursorVisible = frame >= 15;
  const isBouncing = frame >= 40;
  const claudeRunning = frame >= 44;

  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <AbsoluteFill
        style={{
          opacity: desktopFade,
          background:
            "radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #12121f 40%, #0a0a14 100%)",
        }}
      />

      <MenuBar />

      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: `translateX(-50%) translateY(${dockY}px)`,
          opacity: dockOpacity,
          zIndex: 20,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.18)",
            padding: `${DOCK_PADDING_Y}px ${DOCK_PADDING_X}px`,
            display: "flex",
            alignItems: "flex-end",
            gap: ICON_GAP,
          }}
        >
          {DOCK_APPS.map((app, i) => (
            <DockIcon
              app={app}
              bouncing={app.id === "claude" && isBouncing}
              index={i}
              key={app.id}
              showDot={app.running || (app.id === "claude" && claudeRunning)}
            />
          ))}
        </div>
      </div>

      {cursorVisible ? (
        <MacOSCursor opacity={1} scale={clickScale} x={cursorX} y={cursorY} />
      ) : null}
    </AbsoluteFill>
  );
};
