import { cn } from "@/lib/cn";

type CellValue = true | false | "partial" | string;

interface FeatureRow {
  feature: string;
  openbeam: CellValue;
  glean: CellValue;
  onyx: CellValue;
}

interface CategoryGroup {
  category: string;
  rows: FeatureRow[];
}

const COMPARISON: CategoryGroup[] = [
  {
    category: "Licensing & Deployment",
    rows: [
      { feature: "Open Source", openbeam: "MIT", glean: false, onyx: "AGPL" },
      {
        feature: "Self-Hosted",
        openbeam: true,
        glean: false,
        onyx: true,
      },
      {
        feature: "Pricing",
        openbeam: "Free",
        glean: "$50K+/yr",
        onyx: "Free",
      },
      {
        feature: "On-Premise Deployment",
        openbeam: true,
        glean: false,
        onyx: true,
      },
    ],
  },
  {
    category: "Search & Discovery",
    rows: [
      {
        feature: "Enterprise Search",
        openbeam: true,
        glean: true,
        onyx: true,
      },
      { feature: "Video Search", openbeam: true, glean: false, onyx: false },
      { feature: "Voice Search", openbeam: true, glean: false, onyx: false },
      {
        feature: "Edge / Local Search",
        openbeam: true,
        glean: false,
        onyx: false,
      },
      {
        feature: "RAG Pipeline",
        openbeam: true,
        glean: true,
        onyx: "partial",
      },
    ],
  },
  {
    category: "AI & Agents",
    rows: [
      {
        feature: "AI Agent Tools",
        openbeam: "129+",
        glean: "Limited",
        onyx: false,
      },
      {
        feature: "Agent Patterns",
        openbeam: "11 types",
        glean: "partial",
        onyx: false,
      },
      {
        feature: "Mission Control",
        openbeam: true,
        glean: false,
        onyx: false,
      },
      {
        feature: "Workflow Builder",
        openbeam: true,
        glean: false,
        onyx: false,
      },
    ],
  },
  {
    category: "Platform",
    rows: [
      {
        feature: "Connectors",
        openbeam: "23",
        glean: "100+",
        onyx: "30+",
      },
      {
        feature: "Real-time Sync",
        openbeam: true,
        glean: true,
        onyx: "partial",
      },
      { feature: "Mobile App", openbeam: true, glean: true, onyx: false },
      { feature: "CLI", openbeam: true, glean: false, onyx: false },
      {
        feature: "Full API Access",
        openbeam: true,
        glean: "partial",
        onyx: "partial",
      },
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-4 w-4 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-3.5 w-3.5 text-muted-foreground/30"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function PartialIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-3.5 w-3.5 text-muted-foreground/50"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function CellContent({
  value,
  isOpenBeam,
}: {
  value: CellValue;
  isOpenBeam?: boolean;
}) {
  if (value === true) {
    return <CheckIcon />;
  }
  if (value === false) {
    return <XIcon />;
  }
  if (value === "partial") {
    return <PartialIcon />;
  }

  return (
    <span
      className={cn(
        "font-sans text-sm",
        isOpenBeam ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {value}
    </span>
  );
}

export function ComparisonSection() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-2xl text-foreground">
            How we compare
          </h2>
          <p className="mx-auto mt-3 max-w-lg font-sans text-muted-foreground text-sm leading-relaxed">
            The only enterprise search platform that&apos;s fully open source,
            self-hosted, and ships with a complete AI agent framework.
          </p>
        </div>

        <div className="scrollbar-hide mx-auto max-w-4xl overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse font-sans text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background py-4 pr-6 text-left font-normal text-muted-foreground" />
                <th className="relative w-[160px] py-4 text-center">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-foreground" />
                  <span className="font-medium text-foreground">OpenBeam</span>
                </th>
                <th className="w-[140px] py-4 text-center font-normal text-muted-foreground">
                  Glean
                </th>
                <th className="w-[140px] py-4 text-center font-normal text-muted-foreground">
                  Onyx
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((group) => (
                <>
                  <tr key={group.category}>
                    <td
                      className="sticky left-0 z-10 bg-background pt-8 pb-2 font-sans text-muted-foreground text-xs uppercase tracking-wide"
                      colSpan={4}
                    >
                      {group.category}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      className="border-border/50 border-b transition-colors hover:bg-muted/30"
                      key={row.feature}
                    >
                      <td className="sticky left-0 z-10 bg-background py-3 pr-6 text-foreground">
                        {row.feature}
                      </td>
                      <td className="bg-foreground/[0.02] py-3 text-center">
                        <CellContent isOpenBeam value={row.openbeam} />
                      </td>
                      <td className="py-3 text-center">
                        <CellContent value={row.glean} />
                      </td>
                      <td className="py-3 text-center">
                        <CellContent value={row.onyx} />
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
