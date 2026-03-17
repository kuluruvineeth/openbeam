import type React from "react";

interface LogoProps {
  size?: number;
}

const SlackLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const GmailLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const GitHubLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const GoogleDriveLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const LinearLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const NotionLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
  <svg
    fill="none"
    height={size}
    viewBox="0 0 100 100"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"
      fill="#fff"
    />
    <path
      clipRule="evenodd"
      d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.437 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z"
      fill="#000"
      fillRule="evenodd"
    />
  </svg>
);

const SamsaraLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const MQTTLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const OPCUALogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const BACnetLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const ThingsBoardLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const NodeREDLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const OmniverseLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const MatterportLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const ViamLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const FHIRLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
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

const NvdLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M24 4L8 13v22l16 9 16-9V13L24 4Z" fill="#002868" />
    <path
      d="M24 4L8 13v22l16 9 16-9V13L24 4Z"
      fill="none"
      stroke="#001A44"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <circle cx="18" cy="20" fill="#FFFFFF" r="2" />
    <circle cx="24" cy="20" fill="#FFFFFF" r="2" />
    <circle cx="30" cy="20" fill="#FFFFFF" r="2" />
    <circle cx="18" cy="28" fill="#FFFFFF" r="2" />
    <circle cx="24" cy="28" fill="#FFFFFF" r="2" />
    <circle cx="30" cy="28" fill="#FFFFFF" r="2" />
    <path d="M18 22v4M24 22v4M30 22v4" stroke="#FFFFFF" strokeWidth="1.2" />
  </svg>
);

const CisaKevLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M24 4L8 12v12c0 10.667 6.667 20 16 24 9.333-4 16-13.333 16-24V12L24 4Z"
      fill="#BF0A30"
    />
    <path
      d="M24 4L8 12v12c0 10.667 6.667 20 16 24 9.333-4 16-13.333 16-24V12L24 4Z"
      fill="none"
      stroke="#8C0723"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
    <rect fill="#FFFFFF" height="12" rx="1.5" width="3" x="22.5" y="15" />
    <circle cx="24" cy="32" fill="#FFFFFF" r="2" />
  </svg>
);

const MitreAttackLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="6" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="19" y="6" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="32" y="6" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="19" />
    <rect fill="#D4604A" height="10" rx="2" width="10" x="19" y="19" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="32" y="19" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="6" y="32" />
    <rect fill="#C64227" height="10" rx="2" width="10" x="19" y="32" />
    <rect fill="#D4604A" height="10" rx="2" width="10" x="32" y="32" />
  </svg>
);

const OwaspLogo: React.FC<LogoProps> = ({ size = 32 }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: logo
  <svg
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="24"
      cy="24"
      fill="none"
      r="19"
      stroke="#1D7AD7"
      strokeWidth="2.5"
    />
    <ellipse
      cx="24"
      cy="24"
      fill="none"
      rx="8"
      ry="19"
      stroke="#1D7AD7"
      strokeWidth="1.5"
    />
    <path d="M5 24h38" stroke="#1D7AD7" strokeWidth="1.5" />
    <path d="M8 14h32" stroke="#1D7AD7" strokeWidth="1" />
    <path d="M8 34h32" stroke="#1D7AD7" strokeWidth="1" />
    <rect fill="#1D7AD7" height="11" rx="3" width="14" x="17" y="17" />
    <rect
      fill="none"
      height="11"
      rx="3"
      stroke="#1565B0"
      strokeWidth="1"
      width="14"
      x="17"
      y="17"
    />
    <rect fill="#FFFFFF" height="4" rx="0.5" width="1.5" x="23.25" y="20" />
    <circle cx="24" cy="26" fill="#FFFFFF" r="1" />
  </svg>
);

export const CONNECTOR_LOGOS: Record<string, React.FC<LogoProps>> = {
  Slack: SlackLogo,
  Gmail: GmailLogo,
  GitHub: GitHubLogo,
  "Google Drive": GoogleDriveLogo,
  Linear: LinearLogo,
  Notion: NotionLogo,
  Samsara: SamsaraLogo,
  MQTT: MQTTLogo,
  "OPC-UA": OPCUALogo,
  BACnet: BACnetLogo,
  ThingsBoard: ThingsBoardLogo,
  "Node-RED": NodeREDLogo,
  Omniverse: OmniverseLogo,
  Matterport: MatterportLogo,
  Viam: ViamLogo,
  FHIR: FHIRLogo,
  NVD: NvdLogo,
  "CISA KEV": CisaKevLogo,
  "MITRE ATT&CK": MitreAttackLogo,
  OWASP: OwaspLogo,
};
