import type { ReactElement } from "react";

type IconProps = {
  size?: number;
};

export const AsanaIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 32 32"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M25.042 16.87c-3.844 0-6.964 3.115-6.964 6.958 0 3.849 3.12 6.964 6.964 6.964 3.839 0 6.958-3.12 6.958-6.964 0-3.839-3.115-6.958-6.958-6.958zM6.958 16.87c-3.839 0-6.958 3.115-6.958 6.958 0 3.849 3.12 6.964 6.958 6.964 3.844 0 6.964-3.12 6.964-6.964 0-3.839-3.115-6.958-6.964-6.958zM22.958 8.172c0 3.844-3.115 6.958-6.958 6.958s-6.958-3.115-6.958-6.958c0-3.844 3.115-6.964 6.958-6.964s6.958 3.12 6.958 6.964z"
      fill="#F06A6A"
    />
  </svg>
);

export const SlackIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="106 106 300 300"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M169.029 295.577C169.029 312.922 154.86 327.091 137.515 327.091C120.169 327.091 106 312.922 106 295.577C106 278.231 120.169 264.062 137.515 264.062H169.029V295.577Z"
      fill="#E01E5A"
    />
    <path
      d="M184.909 295.577C184.909 278.231 199.078 264.062 216.423 264.062C233.769 264.062 247.938 278.231 247.938 295.577V374.485C247.938 391.831 233.769 406 216.423 406C199.078 406 184.909 391.831 184.909 374.485V295.577Z"
      fill="#E01E5A"
    />
    <path
      d="M216.423 169.029C199.078 169.029 184.909 154.86 184.909 137.515C184.909 120.169 199.078 106 216.423 106C233.769 106 247.938 120.169 247.938 137.515V169.029H216.423Z"
      fill="#36C5F0"
    />
    <path
      d="M216.423 184.909C233.769 184.909 247.938 199.078 247.938 216.423C247.938 233.769 233.769 247.938 216.423 247.938H137.515C120.169 247.938 106 233.769 106 216.423C106 199.078 120.169 184.909 137.515 184.909H216.423Z"
      fill="#36C5F0"
    />
    <path
      d="M342.971 216.423C342.971 199.078 357.14 184.909 374.485 184.909C391.831 184.909 406 199.078 406 216.423C406 233.769 391.831 247.938 374.485 247.938H342.971V216.423Z"
      fill="#2EB67D"
    />
    <path
      d="M327.091 216.423C327.091 233.769 312.922 247.938 295.577 247.938C278.231 247.938 264.062 233.769 264.062 216.423V137.515C264.062 120.169 278.231 106 295.577 106C312.922 106 327.091 120.169 327.091 137.515V216.423Z"
      fill="#2EB67D"
    />
    <path
      d="M295.577 342.971C312.922 342.971 327.091 357.14 327.091 374.485C327.091 391.831 312.922 406 295.577 406C278.231 406 264.062 391.831 264.062 374.485V342.971H295.577Z"
      fill="#ECB22E"
    />
    <path
      d="M295.577 327.091C278.231 327.091 264.062 312.922 264.062 295.577C264.062 278.231 278.231 264.062 295.577 264.062H374.485C391.831 264.062 406 278.231 406 295.577C406 312.922 391.831 327.091 374.485 327.091H295.577Z"
      fill="#ECB22E"
    />
  </svg>
);

export const GmailIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"
      fill="#4caf50"
    />
    <path
      d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"
      fill="#1e88e5"
    />
    <polygon
      fill="#e53935"
      points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"
    />
    <path
      d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"
      fill="#c62828"
    />
    <path
      d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z"
      fill="#fbc02d"
    />
  </svg>
);

export const GoogleDriveIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="3 5 42 38"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M38.59,39c-0.535,0.93-0.298,1.68-1.195,2.197C36.498,41.715,35.465,42,34.39,42H13.61c-1.074,0-2.106-0.285-3.004-0.802C9.708,40.681,9.945,39.93,9.41,39l7.67-9h13.84L38.59,39z"
      fill="#1e88e5"
    />
    <path
      d="M27.463,6.999c1.073-0.002,2.104-0.716,3.001-0.198c0.897,0.519,1.66,1.27,2.197,2.201l10.39,17.996c0.537,0.93,0.807,1.967,0.808,3.002c0.001,1.037-1.267,2.073-1.806,3.001l-11.127-3.005l-6.924-11.993L27.463,6.999z"
      fill="#fbc02d"
    />
    <path
      d="M43.86,30c0,1.04-0.27,2.07-0.81,3l-3.67,6.35c-0.53,0.78-1.21,1.4-1.99,1.85L30.92,30H43.86z"
      fill="#e53935"
    />
    <path
      d="M5.947,33.001c-0.538-0.928-1.806-1.964-1.806-3c0.001-1.036,0.27-2.073,0.808-3.004l10.39-17.996c0.537-0.93,1.3-1.682,2.196-2.2c0.897-0.519,1.929,0.195,3.002,0.197l3.459,11.009l-6.922,11.989L5.947,33.001z"
      fill="#4caf50"
    />
    <path
      d="M17.08,30l-6.47,11.2c-0.78-0.45-1.46-1.07-1.99-1.85L4.95,33c-0.54-0.93-0.81-1.96-0.81-3H17.08z"
      fill="#1565c0"
    />
    <path
      d="M30.46,6.8L24,18L17.53,6.8c0.78-0.45,1.66-0.73,2.6-0.79L27.46,6C28.54,6,29.57,6.28,30.46,6.8z"
      fill="#2e7d32"
    />
  </svg>
);

export const NotionIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="currentColor"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM2.64 1.782l13.168-.933c1.635-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.974c0-.84.374-1.54 1.588-1.193z" />
  </svg>
);

export const LinearIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="currentColor"
    height={size}
    viewBox="0 0 100 100"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" />
  </svg>
);

export const GitHubIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="currentColor"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 .297a12 12 0 00-3.793 23.385c.6.111.82-.259.82-.577v-2.234c-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.744.083-.729.083-.729 1.205.085 1.839 1.239 1.839 1.239 1.07 1.833 2.807 1.304 3.492.997.108-.775.419-1.304.762-1.604-2.665-.303-5.467-1.333-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.53 11.53 0 016.004 0c2.291-1.552 3.297-1.23 3.297-1.23.656 1.652.244 2.873.12 3.176.771.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.625-5.479 5.921.431.372.815 1.104.815 2.224v3.293c0 .321.216.694.825.576A12.004 12.004 0 0012 .297" />
  </svg>
);

export const SamsaraIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4Zm0 3c9.389 0 17 7.611 17 17s-7.611 17-17 17S7 33.389 7 24 14.611 7 24 7Z"
      fill="#00263E"
    />
    <path
      d="M24 14c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10Zm-3 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm6 0a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM18 28c0-1 2.686-3 6-3s6 2 6 3-2.686 2-6 2-6-1-6-2Z"
      fill="#00263E"
    />
    <path
      d="M15 12.5 12 8M33 12.5 36 8"
      stroke="#00263E"
      strokeLinecap="round"
      strokeWidth="2.5"
    />
  </svg>
);

export const MQTTIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.657 23.994h-9.45A1.212 1.212 0 0 1 0 22.788v-9.18h.071c5.784 0 10.504 4.65 10.586 10.386Zm7.606 0h-4.045C14.135 16.246 7.795 9.977 0 9.942V6.038h.071c9.983 0 18.121 8.044 18.192 17.956Zm4.53 0h-.97C21.754 12.071 11.995 2.407 0 2.372v-1.16C0 .55.544.006 1.207.006h7.64C15.733 2.49 21.257 7.789 24 14.508v8.291c0 .663-.544 1.195-1.207 1.195ZM16.713.006h6.092A1.19 1.19 0 0 1 24 1.2v5.914c-.91-1.242-2.046-2.65-3.158-3.762C19.588 2.11 18.122.987 16.714.005Z"
      fill="#660066"
    />
  </svg>
);

export const OPCUAIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#2C5591" height="40" rx="4" width="40" x="4" y="4" />
    <text
      dominantBaseline="central"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
      fontSize="12"
      fontWeight="700"
      textAnchor="middle"
      x="24"
      y="19"
    >
      OPC
    </text>
    <text
      dominantBaseline="central"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
      fontSize="11"
      fontWeight="700"
      textAnchor="middle"
      x="24"
      y="33"
    >
      UA
    </text>
  </svg>
);

export const BACnetIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#00843D" height="40" rx="4" width="40" x="4" y="4" />
    <path
      d="M16 14h6c2.761 0 5 1.79 5 4s-2.239 4-5 4h-6v-8Zm0 8h7c2.761 0 5 1.79 5 4s-2.239 4-5 4h-7v-8Z"
      fill="none"
      stroke="#FFFFFF"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <circle cx="36" cy="18" fill="#FFFFFF" r="2" />
    <circle cx="36" cy="30" fill="#FFFFFF" r="2" />
    <path d="M28 18h6M28 30h6" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);

export const ThingsBoardIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 54 54"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M6.923 15.226.458 26.424a1.2 1.2 0 0 0-.138.315 1.2 1.2 0 0 0 .151.821l6.452 11.174a1.2 1.2 0 0 0 1.366.366l1.73-.999a1.2 1.2 0 0 0 .365-1.366l-5.632-9.754 5.633-9.756a1.2 1.2 0 0 0-.366-1.366l-1.73-.999a1.2 1.2 0 0 0-1.366.366Z"
      fill="#305680"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M47.231 15.226l6.466 11.198c.064.097.111.203.138.315a1.2 1.2 0 0 1-.152.821l-6.451 11.174a1.2 1.2 0 0 1-1.366.366l-1.73-.999a1.2 1.2 0 0 1-.366-1.366l5.633-9.754-5.633-9.756a1.2 1.2 0 0 1 .366-1.366l1.73-.999a1.2 1.2 0 0 1 1.365.366Z"
      fill="#305680"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M27 38c6.075 0 11-4.925 11-11S33.075 16 27 16 16 20.925 16 27s4.925 11 11 11Zm0 2c7.18 0 13-5.82 13-13S34.18 14 27 14 14 19.82 14 27s5.82 13 13 13Z"
      fill="#305680"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="m19.074 27.576 8.503-8.503a1 1 0 0 1 1.414 0l6.052 6.053a1 1 0 0 1 0 1.414l-8.502 8.503a1 1 0 0 1-1.414 0l-6.053-6.053a1 1 0 0 1 0-1.414Zm10.404-4.258a.5.5 0 0 0-.91-.546l-.546 1.75-4.129 2.064a.5.5 0 0 0-.392.341l.583 2.334a.5.5 0 0 0 .91.545l.437-1.75 4.129-2.064a.5.5 0 0 0 .392-.341l-.474-2.333Z"
      fill="#305680"
      fillRule="evenodd"
    />
  </svg>
);

export const NodeREDIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 0C1.338 0 0 1.338 0 3v6.107h2.858c1.092 0 1.97.868 1.964 1.96v.021c.812-.095 1.312-.352 1.674-.683.416-.382.69-.91 1.016-1.499.325-.59.71-1.244 1.408-1.723.575-.395 1.355-.644 2.384-.686v-.45c0-1.092.88-1.976 1.972-1.976h7.893c1.091 0 1.974.884 1.974 1.976v1.942c0 1.091-.883 2.029-1.974 2.029h-7.893c-1.092 0-1.972-.938-1.972-2.03v-.453c-.853.037-1.408.236-1.798.504-.48.33-.774.802-1.086 1.368-.312.565-.63 1.22-1.222 1.763l-.077.069c3.071.415 4.465 1.555 5.651 2.593 1.39 1.215 2.476 2.275 6.3 2.288v-.46c0-1.092.894-1.946 1.986-1.946H24V3c0-1.662-1.338-3-3-3zm10.276 5.41c-.369 0-.687.268-.687.637v1.942c0 .368.318.636.687.636h7.892a.614.614 0 0 0 .635-.636V6.047a.614.614 0 0 0-.635-.636zM0 10.448v3.267h2.858a.696.696 0 0 0 .678-.69v-1.942c0-.368-.31-.635-.678-.635zm4.821 1.67v.907A1.965 1.965 0 0 1 2.858 15H0v6c0 1.662 1.338 3 3 3h18c1.662 0 3-1.338 3-3v-1.393h-2.942c-1.092 0-1.986-.913-1.986-2.005v-.445c-4.046-.032-5.598-1.333-6.983-2.544-1.437-1.257-2.751-2.431-7.268-2.496zM21.058 15a.644.644 0 0 0-.647.66v1.942c0 .368.278.612.647.612H24V15z"
      fill="#8F0000"
    />
  </svg>
);

export const FHIRIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4c-2 4-8 10-8 18 0 6.627 3.582 12 8 12s8-5.373 8-12c0-8-6-14-8-18Z"
      fill="#E35205"
    />
    <path
      d="M24 8c-1.5 3-5.5 7.5-5.5 14 0 4.97 2.462 9 5.5 9s5.5-4.03 5.5-9c0-6.5-4-11-5.5-14Z"
      fill="#F49800"
    />
    <path
      d="M24 13c-1 2-3.5 5-3.5 9 0 3.314 1.567 6 3.5 6s3.5-2.686 3.5-6c0-4-2.5-7-3.5-9Z"
      fill="#FFE100"
    />
    <text
      dominantBaseline="central"
      fill="#E35205"
      fontFamily="Arial, sans-serif"
      fontSize="7"
      fontWeight="700"
      textAnchor="middle"
      x="24"
      y="42"
    >
      FHIR
    </text>
  </svg>
);

export const MatterportIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M8 38V16l8 8v14H8Z" fill="#FF3158" />
    <path d="M16 38V24l8-8v22h-8Z" fill="#E0234E" />
    <path d="M24 38V16l8 8v14h-8Z" fill="#FF3158" />
    <path d="M32 38V24l8-8v22h-8Z" fill="#E0234E" />
    <path d="M8 16l8-8 8 8-8 8-8-8Z" fill="#FF5A7D" />
    <path d="M24 16l8-8 8 8-8 8-8-8Z" fill="#FF5A7D" />
  </svg>
);

export const OmniverseIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z"
      fill="#76B900"
    />
  </svg>
);

export const ViamIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10 10h5l9 20 9-20h5L26 42h-4L10 10Z" fill="#1A1A2E" />
    <circle
      cx="24"
      cy="24"
      fill="none"
      r="2"
      stroke="#4361EE"
      strokeWidth="1.5"
    />
    <circle
      cx="24"
      cy="24"
      fill="none"
      r="6"
      stroke="#4361EE"
      strokeDasharray="3 3"
      strokeWidth="1"
    />
  </svg>
);

export const AwsIotIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#FF9900" height="40" rx="4" width="40" x="4" y="4" />
    <circle cx="24" cy="20" fill="#FFFFFF" r="3" />
    <circle cx="15" cy="30" fill="#FFFFFF" r="2.5" />
    <circle cx="33" cy="30" fill="#FFFFFF" r="2.5" />
    <path
      d="M24 23v4M17 29l5-3M31 29l-5-3"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);

export const AzureIotIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#0078D4" height="40" rx="4" width="40" x="4" y="4" />
    <path
      d="M14 26c0-5.523 4.477-10 10-10s10 4.477 10 10"
      fill="none"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeWidth="2"
    />
    <path
      d="M18 26c0-3.314 2.686-6 6-6s6 2.686 6 6"
      fill="none"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeWidth="2"
    />
    <circle cx="24" cy="27" fill="#FFFFFF" r="2" />
    <circle cx="16" cy="34" fill="#FFFFFF" r="2" />
    <circle cx="32" cy="34" fill="#FFFFFF" r="2" />
    <path
      d="M24 29v3M18 33l4-2M30 33l-4-2"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);

export const SmartThingsIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="24" cy="24" fill="#15BDB2" r="20" />
    <circle cx="24" cy="16" fill="#FFFFFF" r="2.5" />
    <circle cx="17" cy="28" fill="#FFFFFF" r="2.5" />
    <circle cx="31" cy="28" fill="#FFFFFF" r="2.5" />
    <circle
      cx="24"
      cy="24"
      fill="none"
      r="2"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    <path
      d="M24 18.5v3.5M19 27l3-2M29 27l-3-2"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);

export const VerkadaIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#1A1A2E" height="40" rx="4" width="40" x="4" y="4" />
    <rect
      fill="none"
      height="14"
      rx="2"
      stroke="#FFFFFF"
      strokeWidth="2"
      width="20"
      x="14"
      y="14"
    />
    <circle
      cx="24"
      cy="21"
      fill="none"
      r="4"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    <circle cx="24" cy="21" fill="#FFFFFF" r="1.5" />
    <rect fill="#FFFFFF" height="3" rx="1" width="8" x="20" y="31" />
  </svg>
);

export const OutlookIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    clipRule="evenodd"
    fillRule="evenodd"
    height={size}
    viewBox="0 0 6876 6994"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 779L4033 0l-14 6994L0 6160zm1430 3632c-305-357-390-918-244-1384 203-648 718-867 1149-717 246 86 465 293 582 610 56 152 86 326 88 503 4 318-106 692-324 953-335 400-903 441-1250 35zm314-339c-150-223-191-573-120-864 99-404 352-541 563-447 121 54 228 183 285 381 27 95 42 203 43 314 2 198-52 432-159 595-164 250-442 275-612 22zm2552-2598h2341c131 0 238 107 238 238v86L5035 3039c-24 16-83 62-132 93-72 47-77 38-153-5-117-65-319-203-455-297V1474zm2580 875v2504c0 200-164 365-365 365H4296V3366c133 88 310 204 419 271 88 54 104 79 202 22 45-26 89-60 119-80l1840-1229z"
      fill="#0072c6"
    />
  </svg>
);

export const SharePointIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 32 32"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="15" cy="9.5" fill="#036c70" r="9.5" />
    <circle cx="23.875" cy="17.875" fill="#1a9ba1" r="8.125" />
    <circle cx="16" cy="25.5" fill="#37c6d0" r="6.5" />
    <path
      d="M1.333 8h13.334A1.333 1.333 0 0 1 16 9.333v13.334A1.333 1.333 0 0 1 14.667 24H1.333A1.333 1.333 0 0 1 0 22.667V9.333A1.333 1.333 0 0 1 1.333 8z"
      fill="#03787c"
    />
    <path
      d="M5.67 15.825a2.645 2.645 0 0 1-.822-.87 2.361 2.361 0 0 1-.287-1.19 2.29 2.29 0 0 1 .533-1.541A3.142 3.142 0 0 1 6.51 11.3a5.982 5.982 0 0 1 1.935-.3 7.354 7.354 0 0 1 2.549.357v1.8a3.986 3.986 0 0 0-1.153-.471 5.596 5.596 0 0 0-1.349-.162 2.926 2.926 0 0 0-1.386.293.91.91 0 0 0-.549.833.844.844 0 0 0 .233.59 2.122 2.122 0 0 0 .627.448q.394.196 1.176.52a1.232 1.232 0 0 1 .169.067 9.697 9.697 0 0 1 1.483.732 2.654 2.654 0 0 1 .877.883 2.558 2.558 0 0 1 .317 1.332 2.48 2.48 0 0 1-.499 1.605 2.789 2.789 0 0 1-1.335.896A6.049 6.049 0 0 1 7.703 21a10.028 10.028 0 0 1-1.722-.142 5.912 5.912 0 0 1-1.4-.404v-1.902a4.5 4.5 0 0 0 1.416.675 5.513 5.513 0 0 0 1.558.25 2.68 2.68 0 0 0 1.413-.3.947.947 0 0 0 .475-.847.904.904 0 0 0-.266-.648 2.704 2.704 0 0 0-.735-.512q-.469-.236-1.386-.62a7.86 7.86 0 0 1-1.386-.725z"
      fill="#fff"
    />
  </svg>
);

export const TeamsIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 32 32"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="17" cy="6" fill="#7b83eb" r="4.667" />
    <circle cx="27.5" cy="7.5" fill="#5059c9" r="3.5" />
    <path
      d="M30.5 12h-7.861a.64.64 0 0 0-.64.64v8.11a5.121 5.121 0 0 0 3.967 5.084A5.006 5.006 0 0 0 32 20.938V13.5a1.5 1.5 0 0 0-1.5-1.5z"
      fill="#5059c9"
    />
    <path
      d="M25 13.5V23a7.995 7.995 0 0 1-14.92 4 7.173 7.173 0 0 1-.5-1 8.367 8.367 0 0 1-.33-1A8.24 8.24 0 0 1 9 23v-9.5a1.498 1.498 0 0 1 1.5-1.5h13a1.498 1.498 0 0 1 1.5 1.5z"
      fill="#7b83eb"
    />
    <path
      d="M1.333 8h13.334A1.333 1.333 0 0 1 16 9.333v13.334A1.333 1.333 0 0 1 14.667 24H1.333A1.333 1.333 0 0 1 0 22.667V9.333A1.333 1.333 0 0 1 1.333 8z"
      fill="#4b53bc"
    />
    <path
      d="M11.98 12.975H8.99v8.02H7.028v-8.02H4.02v-1.97h7.96z"
      fill="#fff"
    />
  </svg>
);

export const ConfluenceIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 256 246"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id="dci-cf-a"
        x1="99.14%"
        x2="33.86%"
        y1="112.05%"
        y2="69.22%"
      >
        <stop offset="0%" stopColor="#0052CC" />
        <stop offset="92.3%" stopColor="#2684FF" />
      </linearGradient>
      <linearGradient
        id="dci-cf-b"
        x1="0.86%"
        x2="66.14%"
        y1="-12.05%"
        y2="30.78%"
      >
        <stop offset="0%" stopColor="#0052CC" />
        <stop offset="92.3%" stopColor="#2684FF" />
      </linearGradient>
    </defs>
    <path
      d="M9.26 187.36c-3.69 6.08-7.79 13.1-10.54 17.87a8.08 8.08 0 0 0 2.87 11.02l57.97 35.14a8.08 8.08 0 0 0 11.06-2.66c2.34-4.05 5.72-9.98 9.63-16.47 27.34-45.37 54.86-39.74 104.19-17.04l56.18 25.82a8.08 8.08 0 0 0 10.63-4.2l28.54-62.8a8.08 8.08 0 0 0-4.02-10.52c-14.35-6.64-42.87-19.74-63.48-29.22-76.87-35.33-142.87-32.93-203.03 52.96z"
      fill="url(#dci-cf-a)"
    />
    <path
      d="M246.74 58.64c3.69-6.08 7.79-13.1 10.54-17.87a8.08 8.08 0 0 0-2.87-11.02L196.44-5.39a8.08 8.08 0 0 0-11.06 2.66c-2.34 4.05-5.72 9.98-9.63 16.47C148.41 59.11 120.89 53.48 71.56 30.78L15.38 4.96a8.08 8.08 0 0 0-10.63 4.2L-23.79 72a8.08 8.08 0 0 0 4.02 10.52c14.35 6.64 42.87 19.74 63.48 29.22 76.87 35.33 142.87 32.93 203.03-53.1z"
      fill="url(#dci-cf-b)"
    />
  </svg>
);

export const JiraIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 256 256"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id="dci-ji-a"
        x1="98.03%"
        x2="58.89%"
        y1="0.22%"
        y2="40.77%"
      >
        <stop offset="18%" stopColor="#0052CC" />
        <stop offset="100%" stopColor="#2684FF" />
      </linearGradient>
      <linearGradient
        id="dci-ji-b"
        x1="100.17%"
        x2="55.35%"
        y1="0.05%"
        y2="44.72%"
      >
        <stop offset="18%" stopColor="#0052CC" />
        <stop offset="100%" stopColor="#2684FF" />
      </linearGradient>
    </defs>
    <path
      d="M244.66 0H121.72a55.33 55.33 0 0 0 55.33 55.33h22.39v21.59a55.34 55.34 0 0 0 55.33 55.34V11.11A11.11 11.11 0 0 0 244.66 0z"
      fill="#2684FF"
    />
    <path
      d="M183.82 61.45H60.88a55.34 55.34 0 0 0 55.34 55.33h22.38v21.6a55.33 55.33 0 0 0 55.33 55.33V72.56a11.11 11.11 0 0 0-11.11-11.11z"
      fill="url(#dci-ji-a)"
    />
    <path
      d="M122.98 122.9H.04a55.33 55.33 0 0 0 55.33 55.34h22.39v21.59A55.33 55.33 0 0 0 133.1 255.17V134.02a11.11 11.11 0 0 0-11.12-11.12z"
      fill="url(#dci-ji-b)"
    />
  </svg>
);

export const BoxIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 444.893 245.414"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="#0075C9">
      <path d="M239.038 72.43c-33.081 0-61.806 18.6-76.322 45.904-14.516-27.305-43.24-45.902-76.32-45.902-19.443 0-37.385 6.424-51.821 17.266V16.925h-.008C34.365 7.547 26.713 0 17.286 0 7.858 0 .208 7.547.008 16.925H0v143.333h.036c.768 47.051 39.125 84.967 86.359 84.967 33.08 0 61.805-18.603 76.32-45.908 14.517 27.307 43.241 45.906 76.321 45.906 47.715 0 86.396-38.684 86.396-86.396.001-47.718-38.682-86.397-86.394-86.397zM86.395 210.648c-28.621 0-51.821-23.201-51.821-51.82 0-28.623 23.201-51.823 51.821-51.823 28.621 0 51.822 23.2 51.822 51.823 0 28.619-23.201 51.82-51.822 51.82zm152.643 0c-28.622 0-51.821-23.201-51.821-51.822 0-28.623 23.2-51.821 51.821-51.821 28.619 0 51.822 23.198 51.822 51.821-.001 28.621-23.203 51.822-51.822 51.822z" />
      <path d="M441.651 218.033l-44.246-59.143 44.246-59.144-.008-.007c5.473-7.62 3.887-18.249-3.652-23.913-7.537-5.658-18.187-4.221-23.98 3.157l-.004-.002-38.188 51.047-38.188-51.047-.006.009c-5.793-7.385-16.441-8.822-23.981-3.16-7.539 5.664-9.125 16.293-3.649 23.911l-.008.005 44.245 59.144-44.245 59.143.008.005c-5.477 7.62-3.89 18.247 3.649 23.909 7.54 5.664 18.188 4.225 23.981-3.155l.006.007 38.188-51.049 38.188 51.049.004-.002c5.794 7.377 16.443 8.814 23.98 3.154 7.539-5.662 9.125-16.291 3.652-23.91l.008-.008z" />
    </g>
  </svg>
);

export const DropboxIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z"
      fill="#0061FF"
    />
  </svg>
);

export const HubSpotIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 130 135"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M96.52 43.26V27.63c4.02-1.93 6.84-6.06 6.84-10.85v-.36c0-6.61-5.33-12.03-11.85-12.03h-.35c-6.52 0-11.85 5.41-11.85 12.03v.36c0 4.79 2.82 8.92 6.84 10.85v15.64c-5.99.94-11.46 3.45-15.98 7.14L27.85 17c.28-1.09.48-2.21.48-3.39.01-7.49-5.97-13.57-13.35-13.58C7.6.02 1.6 6.09 1.6 13.58c-.01 7.49 5.97 13.57 13.35 13.58 2.4 0 4.63-.69 6.58-1.82l41.63 32.86c-3.54 5.42-5.62 11.91-5.62 18.91 0 7.32 2.28 14.09 6.13 19.66l-12.66 12.84c-1-.31-2.04-.52-3.14-.52-6.07 0-10.98 4.99-10.98 11.15 0 6.16 4.92 11.15 10.98 11.15 6.07 0 10.99-4.99 10.99-11.15 0-1.11-.21-2.17-.51-3.18l12.52-12.71c5.68 4.4 12.76 7.05 20.46 7.05 18.66 0 33.79-15.35 33.79-34.29 0-17.14-12.41-31.31-28.6-33.84"
      fill="#FF7A59"
    />
  </svg>
);

export const SalesforceIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0.5 0.5 999 699.242"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M416.224 76.763c32.219-33.57 77.074-54.391 126.682-54.391 65.946 0 123.48 36.772 154.12 91.361 26.626-11.896 56.098-18.514 87.106-18.514 118.94 0 215.368 97.268 215.368 217.247 0 119.993-96.428 217.261-215.368 217.261a213.735 213.735 0 0 1-42.422-4.227c-26.981 48.128-78.397 80.646-137.412 80.646-24.705 0-48.072-5.706-68.877-15.853-27.352 64.337-91.077 109.448-165.348 109.448-77.344 0-143.261-48.939-168.563-117.574-11.057 2.348-22.513 3.572-34.268 3.572C75.155 585.74.5 510.317.5 417.262c0-62.359 33.542-116.807 83.378-145.937-10.26-23.608-15.967-49.665-15.967-77.06C67.911 87.25 154.79.5 261.948.5c62.914 0 118.827 29.913 154.276 76.263"
      fill="#00A1E0"
    />
  </svg>
);

export const SecurityShieldIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5Zm0 2.18L19 8.3v3.7c0 4.52-3.13 8.69-7 9.93-3.87-1.24-7-5.41-7-9.93V8.3l7-4.12Z"
      fill="#6366F1"
    />
    <path
      d="M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 15.5c0-.828.895-1.5 2-1.5s2 .672 2 1.5V17h-4v-1.5Z"
      fill="#6366F1"
    />
  </svg>
);

export const MicrosoftCalendarIcon = ({
  size = 16,
}: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M40 6H8a2 2 0 00-2 2v32a2 2 0 002 2h32a2 2 0 002-2V8a2 2 0 00-2-2z"
      fill="#1976d2"
    />
    <path d="M30 14h8v8h-8z" fill="#fff" />
    <path d="M20 14h8v8h-8z" fill="#c8e6ff" />
    <path d="M10 14h8v8h-8z" fill="#fff" />
    <path d="M30 24h8v8h-8z" fill="#c8e6ff" />
    <path d="M20 24h8v8h-8z" fill="#fff" />
    <path d="M10 24h8v8h-8z" fill="#c8e6ff" />
    <path d="M30 34h8v4h-8z" fill="#fff" />
    <path d="M20 34h8v4h-8z" fill="#c8e6ff" />
    <path d="M10 34h8v4h-8z" fill="#fff" />
    <path d="M38 6H10v4h28z" fill="#0d47a1" />
    <circle cx="14" cy="8" fill="#b3d4fc" r="2" />
    <circle cx="34" cy="8" fill="#b3d4fc" r="2" />
  </svg>
);

export const ZendeskIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 363.2 259.5"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M173.8 40.5v112.9H80.3zM173.8 0c0 25.8-20.9 46.7-46.7 46.7S80.3 25.8 80.3 0h93.5zM189.2 153.4c0-25.8 20.9-46.7 46.7-46.7 25.8 0 46.7 20.9 46.7 46.7h-93.4zM189.2 112.9V0h93.5zM241.5 249.9c4.8.1 9.5-1.7 13-5l6.4 6.9c-4.2 4.4-10.1 7.6-19.3 7.6-15.7 0-25.8-10.4-25.8-24.5-.3-13.3 10.3-24.2 23.5-24.5h.8c15.6 0 24.4 11.8 23.6 28.3H227c1.3 6.9 6.1 11.3 14.5 11.2m11.2-18.9c-1-6.4-4.8-11.1-12.4-11.1-7.1 0-12 4-13.3 11.1h25.7zM0 249.4l28.3-28.8H.7v-9h40.7v9.2l-28.3 28.8h28.7v9H0zM73.6 249.9c4.8.1 9.5-1.7 12.9-5l6.4 6.9c-4.2 4.4-10.1 7.6-19.3 7.6-15.7 0-25.8-10.4-25.8-24.5-.3-13.3 10.3-24.2 23.5-24.5h.8c15.6 0 24.4 11.8 23.6 28.3H59.1c1.3 6.9 6.1 11.3 14.5 11.2M84.8 231c-1-6.4-4.8-11.1-12.4-11.1-7.1 0-12 4-13.3 11.1h25.7zM157 235c0-15 11.2-24.4 23.6-24.4 6-.1 11.7 2.5 15.7 7v-27.7h10v68.6h-10V252c-3.9 4.7-9.7 7.5-15.8 7.4-12 0-23.5-9.5-23.5-24.4m39.8-.1c-.2-8.2-7.1-14.7-15.3-14.5-8.2.2-14.7 7.1-14.5 15.3.2 8.1 6.8 14.5 14.9 14.5 8.6 0 14.9-6.8 14.9-15.3M270.3 248.5l9.1-4.7c2.4 4.4 7.1 7 12.1 6.9 5.7 0 8.6-2.9 8.6-6.2 0-3.8-5.5-4.6-11.4-5.8-8-1.7-16.3-4.3-16.3-14 0-7.4 7.1-14.3 18.2-14.2 8.8 0 15.3 3.5 19 9.1l-8.4 4.6c-2.4-3.5-6.4-5.5-10.6-5.4-5.4 0-8.1 2.6-8.1 5.6 0 3.4 4.3 4.3 11.1 5.8 7.7 1.7 16.5 4.2 16.5 14 0 6.5-5.7 15.2-19.1 15.1-9.8.1-16.7-3.8-20.7-10.8M337.2 237.6l-7.9 8.7v12.2h-10v-68.6h10v44.9l21.2-23.3h12.2l-18.4 20.1 18.9 26.9h-11.3zM126.8 210.5c-11.9 0-21.9 7.7-21.9 20.5v27.5h10.2v-26.2c0-7.7 4.4-12.3 12-12.3s11.3 4.6 11.3 12.3v26.2h10.1V231c.1-12.8-9.9-20.5-21.7-20.5"
      fill="#03363d"
    />
  </svg>
);

export const ServiceNowIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 64 64"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M32.195 3.312A32.267 32.267 0 0 0 9.949 58.883a6.346 6.346 0 0 0 8.264.43 23.035 23.035 0 0 1 27.445 0 6.364 6.364 0 0 0 8.389-.43A32.267 32.267 0 0 0 32.195 3.312m-.18 48.275a15.632 15.632 0 0 1-16.133-16.026 16.044 16.044 0 1 1 32.07 0 15.614 15.614 0 0 1-16.026 16.026"
      fill="#81b5a1"
      fillRule="evenodd"
    />
  </svg>
);

export const GoogleCalendarIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="-11.4 -19 98.8 114"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M58 18H18v40h40z" fill="#fff" />
    <path d="M58 76l18-18H58z" fill="#ea4335" />
    <path d="M76 18H58v40h18z" fill="#fbbc04" />
    <path d="M58 58H18v18h40z" fill="#34a853" />
    <path d="M0 58v12c0 3.315 2.685 6 6 6h12V58z" fill="#188038" />
    <path d="M76 18V6c0-3.315-2.685-6-6-6H58v18z" fill="#1967d2" />
    <path d="M58 0H6C2.685 0 0 2.685 0 6v52h18V18h40z" fill="#4285f4" />
    <path
      d="M26.205 49.03c-1.495-1.01-2.53-2.485-3.095-4.435l3.47-1.43c.315 1.2.865 2.13 1.65 2.79.78.66 1.73.985 2.84.985 1.135 0 2.11-.345 2.925-1.035s1.225-1.57 1.225-2.635c0-1.09-.43-1.98-1.29-2.67-.86-.69-1.94-1.035-3.23-1.035h-2.005V36.13h1.8c1.11 0 2.045-.3 2.805-.9.76-.6 1.14-1.42 1.14-2.465 0-.93-.34-1.67-1.02-2.225-.68-.555-1.54-.835-2.585-.835-1.02 0-1.83.27-2.43.815a4.784 4.784 0 00-1.31 2.005l-3.435-1.43c.455-1.29 1.29-2.43 2.515-3.415 1.225-.985 2.79-1.48 4.69-1.48 1.405 0 2.67.27 3.79.815 1.12.545 2 1.3 2.635 2.26.635.965.95 2.045.95 3.245 0 1.225-.295 2.26-.885 3.11-.59.85-1.315 1.5-2.175 1.955v.205a6.605 6.605 0 012.79 2.175c.725.975 1.09 2.14 1.09 3.5 0 1.36-.345 2.575-1.035 3.64S36.38 49.01 35.17 49.62c-1.215.61-2.58.92-4.095.92-1.755.005-3.375-.5-4.87-1.51zM47.52 31.81l-3.81 2.755-1.905-2.89 6.835-4.93h2.62V50h-3.74z"
      fill="#4285f4"
    />
  </svg>
);

export const FigmaIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 38 57"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
    <path
      d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"
      fill="#0ACF83"
    />
    <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
    <path
      d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"
      fill="#F24E1E"
    />
    <path
      d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"
      fill="#A259FF"
    />
  </svg>
);
