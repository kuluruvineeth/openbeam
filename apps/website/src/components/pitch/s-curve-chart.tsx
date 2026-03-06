"use client";

const CURVES = [
  {
    label: "Enterprise Search",
    tam: "$12B",
    color: "#2563EB",
    path: "M 40,340 C 100,338 140,330 180,300 C 220,270 260,200 300,140 C 340,80 380,55 440,50",
    labelX: 300,
    labelY: 115,
  },
  {
    label: "Physical Ops",
    tam: "$180B",
    color: "#0D9488",
    path: "M 200,340 C 260,338 300,330 340,300 C 380,270 420,200 460,140 C 500,80 540,55 600,50",
    labelX: 460,
    labelY: 115,
  },
  {
    label: "Robotics Platform",
    tam: "$750B+",
    color: "#D97706",
    path: "M 380,340 C 440,338 480,330 520,300 C 560,270 600,200 640,140 C 680,80 720,55 760,50",
    labelX: 640,
    labelY: 115,
  },
] as const;

const X_LABELS = [
  { text: "NOW", x: 80 },
  { text: "YEAR 2", x: 280 },
  { text: "YEAR 3-4", x: 480 },
  { text: "YEAR 5+", x: 700 },
] as const;

export function SCurveChart() {
  return (
    <div className="w-full">
      <svg className="h-auto w-full" role="img" viewBox="0 0 800 420">
        <title>Three S-curve market opportunity chart</title>
        <line
          stroke="#2C2C2C"
          strokeWidth="1"
          x1="40"
          x2="780"
          y1="360"
          y2="360"
        />
        <line
          stroke="#2C2C2C"
          strokeWidth="1"
          x1="40"
          x2="40"
          y1="360"
          y2="30"
        />

        {CURVES.map((curve) => (
          <g key={curve.label}>
            <path
              d={curve.path}
              fill="none"
              stroke={curve.color}
              strokeLinecap="round"
              strokeWidth="2.5"
            />
            <circle
              cx={curve.path.split(" ").pop()?.split(",")[0]}
              cy="50"
              fill={curve.color}
              r="3"
            />
            <text
              fill={curve.color}
              fontSize="13"
              fontWeight="500"
              textAnchor="middle"
              x={curve.labelX}
              y={curve.labelY}
            >
              {curve.label}
            </text>
            <text
              fill={curve.color}
              fontSize="11"
              fontWeight="400"
              opacity="0.7"
              textAnchor="middle"
              x={curve.labelX}
              y={curve.labelY + 18}
            >
              {curve.tam}
            </text>
          </g>
        ))}

        {X_LABELS.map((label) => (
          <text
            fill="#878787"
            fontSize="12"
            fontWeight="500"
            key={label.text}
            letterSpacing="0.05em"
            textAnchor="middle"
            x={label.x}
            y="385"
          >
            {label.text}
          </text>
        ))}

        <text
          fill="#878787"
          fontSize="11"
          letterSpacing="0.05em"
          textAnchor="middle"
          transform="rotate(-90, 20, 195)"
          x="20"
          y="195"
        >
          REVENUE
        </text>
      </svg>
    </div>
  );
}
