import type { ReactElement } from "react";

type IconProps = {
  size?: number;
};

export const AzureDevOpsIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 128 128"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        gradientTransform="scale(7.11111)"
        gradientUnits="userSpaceOnUse"
        id="ado-doc-grad"
        x1="9"
        x2="9"
        y1="16.97"
        y2="1.03"
      >
        <stop offset="0" stopColor="#0078d4" />
        <stop offset=".16" stopColor="#1380da" />
        <stop offset=".53" stopColor="#3c91e5" />
        <stop offset=".82" stopColor="#559cec" />
        <stop offset="1" stopColor="#5ea0ef" />
      </linearGradient>
    </defs>
    <path
      d="M120.89 28.445v69.262l-28.445 23.324-44.09-16.07v15.93L23.395 88.25l72.746 5.688V31.574ZM96.64 31.93 55.82 7.11v16.285L18.348 34.418 7.109 48.852v32.785l16.075 7.11V46.718Zm0 0"
      fill="url(#ado-doc-grad)"
    />
  </svg>
);

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

export const GitLabIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 380 380"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M190.443 357.586L253.29 164.234H127.596L190.443 357.586Z"
      fill="#E24329"
    />
    <path
      d="M190.443 357.586L127.596 164.234H18.523L190.443 357.586Z"
      fill="#FC6D26"
    />
    <path
      d="M18.523 164.234L2.203 214.445C0.774 219.84 2.69 225.613 7.226 228.91L190.443 357.586L18.523 164.234Z"
      fill="#FCA326"
    />
    <path
      d="M18.523 164.234H127.596L80.985 20.819C79.336 15.856 72.334 15.856 70.685 20.819L18.523 164.234Z"
      fill="#E24329"
    />
    <path
      d="M190.443 357.586L253.29 164.234H362.363L190.443 357.586Z"
      fill="#FC6D26"
    />
    <path
      d="M362.363 164.234L378.683 214.445C380.112 219.84 378.196 225.613 373.66 228.91L190.443 357.586L362.363 164.234Z"
      fill="#FCA326"
    />
    <path
      d="M362.363 164.234H253.29L299.901 20.819C301.55 15.856 308.552 15.856 310.201 20.819L362.363 164.234Z"
      fill="#E24329"
    />
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

export const GoogleChatIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    clipRule="evenodd"
    fillRule="evenodd"
    height={size}
    viewBox="0 0 512 512"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="matrix(1.6 0 0 1.6 7.443 .154)">
      <clipPath id="gc-doc-clip">
        <path d="M0 0h311v320H0z" />
      </clipPath>
      <g clipPath="url(#gc-doc-clip)">
        <path
          d="M76.37.51l.01 76.47L0 76.96V20.77c.567-3.973 1.743-7.31 3.53-10.01C7.937 4.08 14.343.717 22.75.67 40.523.577 58.397.523 76.37.51z"
          fill="#0066da"
        />
        <path
          d="M76.37.51l157.42.02c.332 0 .653.101.92.29l.37.27c-.107.04-.197.083-.27.13a.297.297 0 00-.17.28l-.02 75.51H76.41l-.03-.03L76.37.51z"
          fill="#fbbc04"
        />
        <path
          d="M235.08 1.09l75.45 75.68-75.91.24.02-75.51c0-.127.057-.22.17-.28.073-.047.163-.09.27-.13z"
          fill="#ea4335"
        />
        <path
          d="M0 76.96l76.38.02.03.03.02 105.68L0 182.67V76.96z"
          fill="#2684fc"
        />
        <path
          d="M310.53 76.77l.47.34v161.9c-1.773 9.687-6.793 15.943-15.06 18.77-2.947 1.013-7.29 1.513-13.03 1.5-37.26-.06-74.9-.117-112.92-.17-5.52-.007-11.12.033-16.8.12-.313.007-.58.12-.8.34a15823.329 15823.329 0 00-56 56.02c-2.87 2.89-6.12 4.5-10.24 3.89-3.84-.567-6.67-2.547-8.49-5.94-.767-1.44-1.157-4.067-1.17-7.88-.047-15.46-.063-30.97-.05-46.53l-.01-38.28 37.78-37.78c.332-.333.786-.52 1.26-.52l118.3.04c.455 0 .83-.375.83-.83l-.03-104.75h.05l75.91-.24z"
          fill="#00ac47"
        />
        <path
          d="M76.43 182.69v38.16l.01 38.28c-15.98.093-31.823.123-47.53.09-6.547-.013-11.263-.527-14.15-1.54-8.093-2.827-13.013-9.093-14.76-18.8v-56.21l76.43.02z"
          fill="#00832d"
        />
      </g>
    </g>
  </svg>
);

export const IntercomIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 256 256"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M221.867 140.748a8.534 8.534 0 0 1-17.067 0V64a8.534 8.534 0 0 1 17.067 0v76.748zm-2.978 53.413c-1.319 1.129-32.93 27.655-90.889 27.655-57.958 0-89.568-26.527-90.887-27.656a8.535 8.535 0 0 1-.925-12.033 8.53 8.53 0 0 1 12.013-.942c.501.42 28.729 23.563 79.8 23.563 51.712 0 79.503-23.31 79.778-23.545 3.571-3.067 8.968-2.655 12.033.925a8.534 8.534 0 0 1-.923 12.033zM34.133 64A8.534 8.534 0 0 1 51.2 64v76.748a8.534 8.534 0 0 1-17.067 0V64zm42.668-17.067a8.534 8.534 0 0 1 17.066 0v114.001a8.534 8.534 0 0 1-17.066 0v-114zm42.666-4.318A8.532 8.532 0 0 1 128 34.082a8.532 8.532 0 0 1 8.534 8.533v123.733a8.534 8.534 0 0 1-17.067 0V42.615zm42.667 4.318a8.534 8.534 0 0 1 17.066 0v114.001a8.534 8.534 0 0 1-17.066 0v-114zM224 0H32C14.327 0 0 14.327 0 32v192c0 17.672 14.327 32 32 32h192c17.673 0 32-14.328 32-32V32c0-17.673-14.327-32-32-32z"
      fill="#1F8DED"
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

export const MondayIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="-1.66 -4.10 243.05 147.51"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m120.24 143.16c-10.63-.26-19.4-4.95-25-14.74-5.74-10.12-5.49-20.48.63-30.35 14.57-23.49 29.33-46.85 44-70.27 3-4.79 5.93-9.65 9.07-14.35a29.4 29.4 0 0 1 40-9.09c13.81 8.51 18.43 26.21 9.83 40.16q-26.37 42.95-53.49 85.48c-5.57 8.77-14.02 13-25.04 13.16z"
      fill="#ffcb00"
    />
    <path
      d="m28.94 143.16c-10.73-.26-19.45-5.16-24.94-14.91-5.66-10.12-5.3-20.5.84-30.37q23.51-37.72 47.23-75.33c2-3.24 4-6.56 6.14-9.7a29.41 29.41 0 0 1 49.41 31.86c-17.52 28.29-35.28 56.48-53.05 84.64-5.77 9.13-14.26 13.65-25.63 13.81z"
      fill="#ff3d57"
    />
    <path
      d="m212.13 85.82c16.17.08 29.26 12.93 29.23 28.69 0 16-13.44 28.9-29.76 28.7s-29.18-12.91-29.16-28.74c.02-16.06 13.16-28.75 29.69-28.65z"
      fill="#00d647"
    />
  </svg>
);

export const ZoomIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 50.667 50.667"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M25.333 50.667c13.992 0 25.334-11.343 25.334-25.334S39.325 0 25.333 0 0 11.342 0 25.333s11.342 25.334 25.333 25.334z"
      fill="#2196F3"
    />
    <path
      clipRule="evenodd"
      d="M14.866 32.574h16.755V20.288c0-1.851-1.5-3.351-3.351-3.351H11.515v12.286c0 1.851 1.5 3.351 3.351 3.351zm18.988-4.467l6.702 4.467V16.937l-6.701 4.468z"
      fill="#fff"
      fillRule="evenodd"
    />
  </svg>
);

export const BitbucketIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="-0.97 -0.58 257.93 230.83"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id="bb-grad"
        x1="108.633%"
        x2="46.927%"
        y1="13.818%"
        y2="78.776%"
      >
        <stop offset=".18" stopColor="#0052cc" />
        <stop offset="1" stopColor="#2684ff" />
      </linearGradient>
    </defs>
    <g fill="none">
      <path d="M101.272 152.561h53.449l12.901-75.32H87.06z" />
      <path
        d="M8.308 0A8.202 8.202 0 0 0 .106 9.516l34.819 211.373a11.155 11.155 0 0 0 10.909 9.31h167.04a8.202 8.202 0 0 0 8.201-6.89l34.82-213.752a8.202 8.202 0 0 0-8.203-9.514zm146.616 152.768h-53.315l-14.436-75.42h80.67z"
        fill="#2684ff"
      />
      <path
        d="M244.61 77.242h-76.916l-12.909 75.36h-53.272l-62.902 74.663a11.105 11.105 0 0 0 7.171 2.704H212.73a8.196 8.196 0 0 0 8.196-6.884z"
        fill="url(#bb-grad)"
      />
    </g>
  </svg>
);

export const ClickUpIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="5.615 2.146 33.174 34.042"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="cu-a"
        x1="5.615"
        x2="32.789"
        y1="31.179"
        y2="31.179"
      >
        <stop offset="0" stopColor="#8930fd" />
        <stop offset="1" stopColor="#49ccf9" />
      </linearGradient>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="cu-b"
        x1="5.941"
        x2="31.978"
        y1="13.086"
        y2="13.086"
      >
        <stop offset="0" stopColor="#ff02f0" />
        <stop offset="1" stopColor="#ffc800" />
      </linearGradient>
    </defs>
    <path
      clipRule="evenodd"
      d="M5.615 27.26l5.015-3.851c2.664 3.485 5.494 5.092 8.645 5.092 3.134 0 5.884-1.588 8.428-5.046l5.086 3.758c-3.67 4.986-8.232 7.62-13.514 7.62-5.265 0-9.871-2.617-13.66-7.574z"
      fill="url(#cu-a)"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M18.992 10.523l-8.925 7.71-4.126-4.797 13.07-11.29 12.967 11.299-4.145 4.78z"
      fill="url(#cu-b)"
      fillRule="evenodd"
    />
  </svg>
);

export const PagerDutyIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 560 400"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="#06ac38">
      <g fillRule="nonzero">
        <path d="m451.026 178.543-8.125 23.045c-1.477 4.136-2.216 6.5-3.582 10.488h-.148c-1.071-3.434-2.031-6.204-3.434-10.266l-7.904-23.304h-9.454l16.36 42.766c-.369.923-.738 1.884-1.144 2.881-1.367 3.323-4.617 5.502-8.199 5.502h-4.062v7.276h4.173c6.758 0 12.852-4.1 15.363-10.415 5.207-13.036 14.071-35.232 19.13-47.973z" />
        <path d="m224.161 213.073c0 15.474-7.091 23.858-21.42 23.858-10.673 0-17.099-5.614-19.389-14.071h8.642c1.477 3.915 4.543 7.423 10.895 7.423 9.786 0 13.258-6.093 13.258-17.69-.074 0-.074-.074-.148-.074-2.105 3.657-6.832 6.907-14.329 6.907-12.039 0-19.721-8.716-19.721-20.94 0-12.704 8.31-21.272 19.795-21.272 7.423 0 11.892 3.176 14.329 6.684-.074-.886-.074-1.809-.074-2.696v-2.696h8.162zm-33.238-14.661c0 8.309 4.654 14.255 12.631 14.255 7.164 0 12.704-5.059 12.704-14.514 0-8.383-4.875-13.996-12.704-13.996-7.83 0-12.631 5.613-12.631 14.255z" />
        <path d="m237.641 202.068c.332 7.497 5.133 13.443 13.442 13.443 5.872 0 8.716-2.77 10.895-6.426h8.235c-2.437 7.718-9.195 13.258-19.462 13.258-13.184 0-21.42-8.863-21.42-22.232s8.568-22.786 21.42-22.786c13.923 0 20.349 10.599 20.349 22.084v2.696h-33.459zm24.891-6.5c-.739-6.758-4.986-11.559-11.966-11.559-6.684 0-11.818 4.395-12.63 11.559z" />
        <path d="m284.284 178.543v5.466c1.366-3.988 5.54-6.5 10.341-6.5 1.071 0 1.551.074 2.105.148v7.497c-.739-.148-1.958-.259-2.844-.259-7.719 0-9.196 5.688-9.196 14.256v22.158h-8.235v-35.084c0-2.696 0-5.06-.074-7.645h7.903z" />
        <path d="m381.301 215.178c-2.216 3.657-6.352 7.165-13.591 7.165-9.934 0-14.809-6.094-14.809-17.173v-26.627h8.199v23.525c0 8.383 2.77 13.443 9.454 13.443 8.789 0 10.341-7.977 10.341-17.358v-19.61h8.235v36.303c0 2.216 0 4.321.074 6.426h-7.903z" />
        <path d="m407.632 178.543h7.977v6.352h-7.977v25.667c0 4.063 2.032 5.281 5.208 5.281.554 0 1.551-.074 2.031-.147v6.093c-1.219.148-2.105.332-3.176.332-7.571 0-12.372-2.511-12.372-11.079v-26.147h-6.426v-6.352h6.426v-11.559h8.309z" />
      </g>
      <path d="m100 205.761h8.531v15.511h-8.531z" />
      <g fillRule="nonzero">
        <path d="m132.13 165.913c-4.58-2.437-7.756-2.844-15.253-2.844h-16.877v35.306h16.803c6.685 0 11.671-.406 16.065-3.324 4.801-3.176 7.276-8.457 7.276-14.55 0-6.611-3.066-11.892-8.014-14.588zm-13.369 25.076h-10.23v-20.349l9.639-.074c8.789-.111 13.184 2.992 13.184 10.008 0 7.534-5.429 10.415-12.593 10.415z" />
        <path d="m301.752 163.069h14.255c21.346.148 31.613 10.563 31.687 29.249.074 15.918-8.162 28.769-30.283 28.991h-15.622v-58.24zm8.642 50.965h4.986c15.474 0 23.561-5.909 23.561-21.753-.037-13.922-8.051-21.899-22.749-21.899-2.844 0-5.798.073-5.798.073z" />
        <path d="m170.057 221.309c-.258-1.699-.258-2.77-.406-5.872-3.25 4.653-7.571 6.684-14.403 6.684-8.974 0-15.474-4.394-15.474-12.371 0-9.196 8.79-12.224 20.201-13.775 2.844-.407 6.02-.739 8.79-.961 0-8.457-4.69-11.005-9.602-11.005s-8.494 3.435-8.494 7.94h-7.977c0-8.679 6.832-14.514 16.656-14.514 9.823 0 17.394 4.063 17.394 19.721v8.31c0 6.906.332 11.965 1.071 15.88h-7.756zm-21.419-11.67c0 3.988 3.25 6.5 8.457 6.5 7.644 0 11.744-4.654 11.744-12.963 0-1.071 0-1.81.074-2.29-13.923 1.441-20.275 2.807-20.275 8.753z" />
      </g>
    </g>
  </svg>
);

export const FreshserviceIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="-2.94 -27.44 521.39 549.44"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m349 .05c33.65 0 67.31.11 101 0 17-.13 32.14 4.42 45 15.71 14.12 12.36 22.31 27.9 22.38 46.66.29 68.21 1.07 136.44-.2 204.62-1.15 61.39-23.14 115.58-63.66 161.81-42.35 48.35-95.66 77.15-159.34 86.15-49.35 7-96.94.09-142.21-20.74-63.21-29.08-107.86-76.36-133.85-140.72-15.63-38.73-21.06-79.24-16.63-120.95q8.73-82.09 62.94-144.29c35-39.93 78.33-66.49 129.63-80a258.84 258.84 0 0 1 67-8.22q43.94.03 87.94-.03zm-50.06 230.35c-19.74 0-39.48-.06-59.22.06-3.43 0-4.51-.59-3.25-4.27 4.86-14.28 9.44-28.65 14.13-43q7.25-22.14 14.48-44.28c1.25-3.83 0-6.93-3.33-8.81s-6.69-1.19-9.2 1.94c-1.4 1.75-2.66 3.61-4 5.43q-34.52 48.08-69 96.13-13.73 19.12-27.55 38.16a9.35 9.35 0 0 0-1.11 10.12c1.71 3.68 4.86 5.08 8.71 5.23 1.64.06 3.29.05 4.93.05h111.26c6.72 0 6.84 0 4.7 6.6q-13.56 41.53-27.24 83-1.65 5-.87 8.1 2.73 10.1s6.73 1.14 10-3c.47-.58.9-1.19 1.34-1.8q49-67.77 97.94-135.54c2.45-3.39 3.67-6.92 1.6-10.84s-5.59-5.35-10.06-5.33c-19.28.12-38.57.05-57.86.05z"
      fill="#09c6fa"
    />
    <path
      d="m298.94 230.4c19.29 0 38.58.07 57.87-.05 4.47 0 7.95 1.33 10.06 5.33s.85 7.45-1.6 10.84q-49 67.75-97.94 135.54c-.44.61-.87 1.22-1.34 1.8-3.3 4.12-6.37 5-10 3s-4.38-5.08-2.73-10.1q13.65-41.49 27.24-83c2.14-6.57 2-6.6-4.7-6.6h-111.26c-1.64 0-3.29 0-4.93-.05-3.85-.15-7-1.55-8.71-5.23a9.35 9.35 0 0 1 1.1-10.12q13.83-19 27.58-38.15 34.53-48 69-96.13c1.31-1.82 2.57-3.68 4-5.43 2.51-3.13 5.8-3.86 9.2-1.94s4.58 5 3.33 8.81l-14.48 44.28c-4.69 14.34-9.27 28.71-14.13 43-1.26 3.68-.18 4.29 3.25 4.27 19.71-.13 39.45-.07 59.19-.07z"
      fill="#fbfefe"
    />
  </svg>
);

export const GongIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 64 64"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#7C3AED" height="64" rx="8" width="64" />
    <path
      d="M32 14c-9.941 0-18 8.059-18 18s8.059 18 18 18 18-8.059 18-18-8.059-18-18-18zm0 30c-6.627 0-12-5.373-12-12s5.373-12 12-12 12 5.373 12 12-5.373 12-12 12z"
      fill="#FFFFFF"
    />
    <circle cx="32" cy="32" fill="#FFFFFF" r="5" />
    <path
      d="M32 8v4M32 52v4M8 32h4M52 32h4M15.515 15.515l2.828 2.828M45.657 45.657l2.828 2.828M15.515 48.485l2.828-2.828M45.657 18.343l2.828-2.828"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeWidth="2.5"
    />
  </svg>
);

export const S3Icon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 80 80"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="s3-icon-gradient" x1="0%" x2="100%" y1="100%" y2="0%">
        <stop offset="0%" stopColor="#1B660F" />
        <stop offset="100%" stopColor="#6CAE3E" />
      </linearGradient>
    </defs>
    <rect
      fill="url(#s3-icon-gradient)"
      height="80"
      rx="4"
      width="80"
      x="0"
      y="0"
    />
    <path
      d="M60.836 42.893l.384-2.704c3.541 2.121 3.587 2.997 3.586 3.021-.006.005-.61.51-3.97-.314zm-1.943-.54c-6.12-1.853-14.643-5.762-18.092-7.392 0-.014.004-.027.004-.041 0-1.325-1.078-2.403-2.404-2.403-1.324 0-2.402 1.078-2.402 2.403 0 1.325 1.078 2.403 2.402 2.403.583 0 1.111-.217 1.528-.562 4.058 1.921 12.515 5.774 18.68 7.594l-2.438 17.206c-.006.047-.01.094-.01.141 0 1.515-6.706 4.298-17.666 4.298-11.075 0-17.853-2.783-17.853-4.298 0-.046-.003-.091-.009-.136L14.538 24.359c4.41 3.035 13.892 4.641 22.962 4.641 9.056 0 18.523-1.6 22.941-4.626l-2.548 17.979zM15 20.478c.072-1.316 7.634-6.478 23.5-6.478 15.864 0 23.427 5.16 23.5 6.478v.449c-.87 2.951-10.67 6.073-23.5 6.073-12.852 0-22.657-3.132-23.5-6.087v-.435zM64 20.5C64 17.035 54.066 12 38.5 12 22.934 12 13 17.035 13 20.5l.094.754 5.548 40.523c.133 4.532 12.219 6.222 19.852 6.222 9.472 0 19.535-2.178 19.665-6.219l2.396-16.897c1.333.319 2.43.482 3.311.482 1.183 0 1.983-.289 2.468-.867.398-.474.55-1.048.436-1.66-.259-1.383-1.902-2.875-5.248-4.784l2.376-16.762.102-.793z"
      fill="#FFFFFF"
    />
  </svg>
);

export const BambooHRIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 64 64"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#73C41D" height="64" rx="8" width="64" />
    <path
      d="M18 16h8.5c4.5 0 7.5 2.5 7.5 6.5 0 3-1.5 5-4 6 3 .8 5 3.2 5 6.5 0 4.5-3.2 7-8 7H18V16zm8 10.5c2 0 3.2-1 3.2-2.8 0-1.8-1.2-2.7-3.2-2.7h-3v5.5h3zm.5 11c2.2 0 3.5-1.1 3.5-3 0-1.9-1.3-3-3.5-3h-3.5v6h3.5z"
      fill="#FFFFFF"
    />
    <path
      d="M38 16h5v11.5h.2L49.5 16H55l-7 13 7.5 13h-5.8l-6.5-11.5H43V42h-5V16z"
      fill="#FFFFFF"
    />
  </svg>
);

export const WorkdayIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    fill="none"
    height={size}
    viewBox="0 0 64 64"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      fill="#FFFFFF"
      height="64"
      rx="8"
      stroke="#E5E7EB"
      strokeWidth="0.5"
      width="64"
    />
    <path
      d="M32 8c-7.7 0-14.7 3.2-19.7 8.3-.3.4-.2 1 .3 1.1.9.2 1.6-.3 2.2-.9C19.5 12 25.4 9.8 32 9.8c6.6 0 12.5 2.2 17.2 6.7.6.5 1.3.8 2.2.9.5 0 .7-.6.3-1C46.7 11.2 39.7 8 32 8z"
      fill="#F49813"
    />
    <path
      d="M17 26h3.6l3.4 12L27.5 26h2.9l3.5 12L37.4 26H41l-5.6 20h-3.1L29 33l-3.3 13h-3.1L17 26z"
      fill="#3069B5"
    />
  </svg>
);

export const GuruIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="0 0 162.31 162.01"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M162.28,96.29c.57,20.21-8.19,35.32-25.42,45C113,154.76,87.31,162.83,59.56,162c-15.64-.5-28.15-8-36.35-21.09C7.51,115.82-.94,88.36.08,58.64.62,43,8.69,30.76,21.86,22.7,46.67,7.52,73.69-.9,103,.08c15.87.53,28.12,8.75,36.46,22.05C153.65,44.77,160.28,69.86,162.28,96.29Z"
      fill="#1B1B1B"
    />
    <path
      d="M92.34,111.57a31.72,31.72,0,0,1-18.88,1.08c-14.71-4-25.39-17.48-25.39-32.16a32.54,32.54,0,0,1,9.68-23.73,33,33,0,0,1,22.66-9.57h.31c15.52.17,25.36,11.89,25.44,12a3.86,3.86,0,0,0,6-4.87c-.49-.6-12.13-14.64-31.35-14.85a40.58,40.58,0,0,0-40.46,41c0,18.11,13.08,34.78,31.11,39.62a36.5,36.5,0,0,0,9.5,1.22,41,41,0,0,0,14-2.51c11.88-4.34,23.47-15.76,23.05-29a79,79,0,0,1-8.47,5.32C107.25,102.44,100,108.78,92.34,111.57Z"
      fill="#fff"
    />
    <path
      d="M121.5,71.35a61.28,61.28,0,0,1-8.35,7.21c-5.16-5-13.38-7.42-19.33-7.42-4.86,0-8.59,1.28-11.07,3.79a10.21,10.21,0,0,0-2.91,7.49c.08,5.25,3.85,10.93,14.16,11.16,5.75.14,11.37-1.72,16.29-4.24a54,54,0,0,0,7-4.27,67.35,67.35,0,0,0,9.87-8.47,3.86,3.86,0,0,0-5.67-5.25ZM94.17,85.86c-3-.07-6.56-.74-6.61-3.56a2.55,2.55,0,0,1,.69-2c.55-.56,2-1.49,5.57-1.49a23.07,23.07,0,0,1,12.33,4A26.05,26.05,0,0,1,94.17,85.86Z"
      fill="#fff"
    />
  </svg>
);

export const GreenhouseIcon = ({ size = 16 }: IconProps): ReactElement => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
  <svg
    height={size}
    viewBox="-8.30925739 -.2362298 217.94925739 445.3362298"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m104.42 444.2c-58.12.85-105.51-49-104.42-106.6a105.12 105.12 0 0 1 105.87-103.37c55.36.15 101.71 47.66 102.71 103.07 1.06 58.7-47.33 107.8-104.16 106.9zm85.45-104.32c.35-47.58-37.69-86.42-85-86.78s-85.87 37.9-86.27 85.47a86.24 86.24 0 0 0 85.26 87.16c46.79.59 85.66-38.21 86.01-85.85zm-189.66-213.65a86.13 86.13 0 0 1 86-86.83c47.2-.09 86.08 38.89 86.15 86.36.08 48.15-38.19 87.13-85.67 87.27-48.18.13-86.34-38.19-86.48-86.8zm18.91-.54a67 67 0 1 0 134.09 1.31c.24-37.53-29.46-68.13-66.4-68.43-37.13-.26-67.4 29.74-67.69 67.12zm117.97-108.37a17.61 17.61 0 0 1 35.22.24 17.53 17.53 0 0 1 -17.74 17.72c-9.9-.07-17.48-7.87-17.48-17.96z"
      fill="#38b2a7"
    />
  </svg>
);
