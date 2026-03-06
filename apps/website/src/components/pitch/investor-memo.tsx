import Image from "next/image";

export function InvestorMemo() {
  return (
    <>
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: print styles
        dangerouslySetInnerHTML={{
          __html: `
						@media print {
							@page { size: A4; margin: 0.7in 0.85in 0.7in 0.85in; }
							:root, .dark {
								--background: 0 0% 100% !important;
								--foreground: 0 0% 7% !important;
								--card: 45 18% 96% !important;
								--card-foreground: 240 10% 3.9% !important;
								--muted: 40 11% 89% !important;
								--muted-foreground: 0 0% 38% !important;
								--border: 45 5% 85% !important;
								--input: 240 5.9% 90% !important;
							}
							body { background: white !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
							article { background: white !important; padding: 0 !important; max-width: 100% !important; }
							.memo-section { break-inside: avoid; }
							.no-print { display: none !important; }
						}
					`,
        }}
      />
      <article className="min-h-screen bg-background px-6 py-12 text-foreground sm:px-8 lg:px-0 print:bg-white print:p-0 print:text-[12.5px] print:leading-[1.6]">
        <div className="mx-auto max-w-[620px]">
          <header className="mb-10 text-center print:mb-6">
            <p className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em]">
              Confidential
            </p>
            <h1 className="mt-2 font-serif text-[32px] text-foreground leading-none tracking-tight print:text-[26px]">
              OpenBeam
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Search across sensors and SaaS
            </p>
            <p className="mt-3 font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest">
              Seed Round&ensp;|&ensp;$4M&ensp;|&ensp;March 2026
            </p>
          </header>

          <section className="memo-section">
            <p className="text-[15px] text-foreground/80 leading-[1.7] print:text-[12.5px]">
              OpenBeam is an open-source platform that unifies enterprise
              knowledge (Slack, Jira, GitHub, Notion) with physical operations
              data (IoT sensors, industrial protocols, robotics telemetry) into
              a single searchable, AI-queryable system — deployable in the
              cloud, on-premises, or fully air-gapped. We are raising $4M to
              hire a small team, scale to 75+ connectors, and sign our first
              design partners.
            </p>
            <p className="mt-3 font-semibold text-[15px] text-foreground leading-[1.7] print:text-[12.5px]">
              Factories generate 1,000x more data than Slack. None of it is
              searchable. Glean proved the digital half at a $7.2B valuation.
              Nobody has built the physical half. We are building both.
            </p>
          </section>

          <section className="memo-section mt-8 print:mt-5">
            <h2 className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em]">
              Problem &amp; Timing
            </h2>
            <div className="mt-3 space-y-2 text-[14px] text-foreground/80 leading-[1.7] print:text-[12px]">
              <p>
                <strong className="text-foreground">
                  Physical operations data has no searchable form.
                </strong>{" "}
                99% of industrial sensor data is never analyzed.
                <sup className="text-[9px] text-muted-foreground/60">
                  {" "}
                  McKinsey
                </sup>{" "}
                Unplanned downtime costs $1.4T/yr.
                <sup className="text-[9px] text-muted-foreground/60">
                  {" "}
                  Siemens
                </sup>{" "}
                A factory engineer can&apos;t search across BACnet readings,
                Slack threads, and maintenance logs in one query. That gap costs
                lives and money.
              </p>
              <p>
                <strong className="text-foreground">
                  Digital knowledge is equally fragmented.
                </strong>{" "}
                Workers lose 35% of their time searching across 130+
                disconnected SaaS tools.
                <sup className="text-[9px] text-muted-foreground/60">
                  {" "}
                  Bloomfire
                </sup>{" "}
                Glean crossed $200M+ ARR addressing digital knowledge alone —
                but can&apos;t deploy at the edge.
              </p>
              <p>
                <strong className="text-foreground">
                  Three forces converging now:
                </strong>{" "}
                PTC divesting ThingWorx for $725M — the incumbent is leaving.
                Goldman revised Physical AI TAM 6x upward. 750K+ industrial
                robots deployed worldwide, generating data no platform can
                search. Regulation forcing on-prem (86% of CIOs planning cloud
                repatriation; DORA, CMMC, EU AI Act all enforcing).
              </p>
            </div>
          </section>

          <section className="memo-section mt-8 print:mt-5">
            <h2 className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em]">
              Solution
            </h2>
            <p className="mt-3 text-[14px] text-foreground/80 leading-[1.7] print:text-[12px]">
              One query across sensors and SaaS. Answers in 200ms. Three layers:
            </p>
            <dl className="mt-2 space-y-1.5 border-border border-l-2 pl-4 text-[13px] print:text-[11.5px]">
              <div>
                <dt className="font-semibold text-foreground">Connect</dt>
                <dd className="text-muted-foreground">
                  25+ connectors today (SaaS, IoT, industrial protocols,
                  spatial). Target: 75+ by EOY.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Understand</dt>
                <dd className="text-muted-foreground">
                  Hybrid search via Vespa. 100+ composable AI tools.
                  Temporal-backed agent workflows.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">
                  Deploy Anywhere
                </dt>
                <dd className="text-muted-foreground">
                  Cloud, on-prem, or air-gapped. SQLite WAL for storage, BLAKE3
                  Merkle sync for integrity, quantized models for local
                  inference. Zero egress.
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[14px] text-foreground/80 leading-[1.7] print:text-[12px]">
              Open source (MIT). Eliminates the #1 sovereign procurement
              objection.
            </p>
          </section>

          <section className="memo-section mt-8 print:mt-5">
            <h2 className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em]">
              Market &amp; Competition
            </h2>
            <table className="mt-3 w-full text-[13px] print:text-[11.5px]">
              <tbody>
                <tr className="border-border/50 border-b">
                  <td className="py-1.5 pr-3 font-mono font-semibold text-foreground">
                    $7B
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[9px] text-muted-foreground/60 uppercase">
                    Now
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    Enterprise search. Validated by Glean at $7.2B.
                  </td>
                </tr>
                <tr className="border-border/50 border-b">
                  <td className="py-1.5 pr-3 font-mono font-semibold text-foreground">
                    $50B+
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[9px] text-muted-foreground/60 uppercase">
                    Yr 2-3
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    Physical operations intelligence. No incumbent.
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-mono font-semibold text-foreground">
                    $143B
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-[9px] text-muted-foreground/60 uppercase">
                    Yr 5+
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    Intelligence layer for physical AI and robotics.
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[13px] text-muted-foreground leading-[1.7] print:text-[11.5px]">
              Bottom-up SAM: 47,000 US manufacturers with 500+ employees. At
              $50K average ACV, that&apos;s a $2.4B serviceable market — before
              adding logistics, energy, and healthcare verticals.
            </p>
            <p className="mt-3 text-[14px] text-foreground/80 leading-[1.7] print:text-[12px]">
              <strong>Glean</strong> ($750M+ raised) is cloud-only — can&apos;t
              deploy at the edge, will never go air-gapped.{" "}
              <strong>Samsara</strong> ($45B) is hardware-bound — no digital
              knowledge search, no cross-source correlation.{" "}
              <strong>Onyx</strong> is digital-only — no physical connectors, no
              edge runtime. <strong>PTC</strong> is divesting ThingWorx for
              $725M — legacy architecture, no AI, no search. The incumbent is
              leaving. Our moat compounds: connectors create cross-source
              intelligence, which creates switching cost, which creates demand
              for more connectors.
            </p>
          </section>

          <section className="memo-section mt-8 print:mt-5">
            <h2 className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em]">
              Business Model
            </h2>
            <table className="mt-3 w-full text-[13px] print:text-[11.5px]">
              <thead>
                <tr className="border-border border-b">
                  <th className="pb-1 text-left font-mono font-normal text-[9px] text-muted-foreground/60 uppercase">
                    Tier
                  </th>
                  <th className="pb-1 text-left font-mono font-normal text-[9px] text-muted-foreground/60 uppercase">
                    Price
                  </th>
                  <th className="pb-1 text-left font-mono font-normal text-[9px] text-muted-foreground/60 uppercase">
                    Includes
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-border/50 border-b">
                  <td className="py-1 text-muted-foreground">Open Source</td>
                  <td className="py-1 font-mono text-foreground">$0</td>
                  <td className="py-1 text-muted-foreground">
                    Self-hosted, MIT, full features, 3 users
                  </td>
                </tr>
                <tr className="border-border/50 border-b">
                  <td className="py-1 font-semibold text-foreground">Pro</td>
                  <td className="py-1 font-mono text-foreground">
                    $15/seat/mo
                  </td>
                  <td className="py-1 text-muted-foreground">
                    Unlimited users, managed cloud, SSO, support
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-muted-foreground">Enterprise</td>
                  <td className="py-1 font-mono text-foreground">Custom</td>
                  <td className="py-1 text-muted-foreground">
                    Air-gapped, RBAC, audit logs, per-device pricing for
                    physical ops
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-[14px] text-foreground/80 leading-[1.7] print:text-[12px]">
              Open source to land. Seat-based for digital. Usage-based for
              physical. Pre-revenue, not pre-product. Every connector, every
              agent tool, every line of edge runtime — built by a single
              engineer.
            </p>
          </section>

          <section className="memo-section mt-8 print:mt-5">
            <h2 className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em]">
              The Ask
            </h2>
            <div className="mt-3 flex items-start gap-4">
              <Image
                alt="Kuluru Vineeth Kumar Reddy"
                className="shrink-0 rounded print:h-[40px] print:w-[40px]"
                height={48}
                src="/profile_photo.jpg"
                width={48}
              />
              <div className="text-[14px] text-foreground/80 leading-[1.7] print:text-[12px]">
                <strong className="text-foreground">
                  Kuluru Vineeth Kumar Reddy
                </strong>
                <span className="ml-1 font-mono text-[10px] text-muted-foreground/60">
                  Builder
                </span>
                <span className="ml-1 text-muted-foreground">
                  — Obsessed with building things that matter.
                </span>
              </div>
            </div>

            <p className="mt-4 font-semibold text-[14px] text-foreground print:text-[12px]">
              $4M seed. First three hires: distributed systems engineer,
              enterprise sales, developer advocate.
            </p>

            <div className="mt-3 flex gap-6 text-[13px] print:text-[11.5px]">
              <table className="flex-1">
                <thead>
                  <tr className="border-border border-b">
                    <th className="pb-1 text-left font-mono font-normal text-[9px] text-muted-foreground/60 uppercase">
                      Allocation
                    </th>
                    <th className="pb-1 text-right font-mono font-normal text-[9px] text-muted-foreground/60 uppercase">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { l: "Engineering (75 connectors)", p: "55%" },
                    { l: "Go-to-Market (design partners)", p: "25%" },
                    { l: "Infrastructure (edge test lab)", p: "10%" },
                    { l: "Compliance (SOC 2)", p: "10%" },
                  ].map((r) => (
                    <tr className="border-border/50 border-b" key={r.l}>
                      <td className="py-1 text-foreground/80">{r.l}</td>
                      <td className="py-1 text-right font-mono text-foreground">
                        {r.p}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="flex-1">
                <thead>
                  <tr className="border-border border-b">
                    <th className="pb-1 text-left font-mono font-normal text-[9px] text-muted-foreground/60 uppercase">
                      Milestone
                    </th>
                    <th className="pb-1 text-right font-mono font-normal text-[9px] text-muted-foreground/60 uppercase">
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { t: "Month 6", a: "Design partners" },
                    { t: "Month 12", a: "$600K ARR" },
                    { t: "Month 18", a: "$1.8M ARR" },
                    { t: "Month 24", a: "$3.6M ARR" },
                    { t: "Month 36", a: "$6M ARR" },
                  ].map((r) => (
                    <tr className="border-border/50 border-b" key={r.t}>
                      <td className="py-1 font-mono text-muted-foreground">
                        {r.t}
                      </td>
                      <td className="py-1 text-right font-mono font-semibold text-foreground">
                        {r.a}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[14px] text-foreground/80 leading-[1.7] print:text-[12px]">
              Base case: 12 enterprise customers at $50K ACV = $600K ARR by
              month 12. Monthly burn: ~$62K. 64+ months runway on $4M. Every
              enterprise will search across sensors and SaaS. The company that
              owns this layer becomes infrastructure.
            </p>
            <p className="mt-2 font-semibold text-[16px] text-foreground print:text-[14px]">
              We&apos;re building it.
            </p>
          </section>

          <footer className="mt-10 flex flex-col items-center gap-3 border-border border-t pt-6 print:mt-6 print:pt-3">
            <a
              className="rounded-md bg-foreground px-8 py-2.5 font-mono text-background text-xs transition-colors hover:bg-foreground/80 print:hidden"
              href="https://openbeam.work"
            >
              Schedule a conversation &rarr;
            </a>
            <p className="font-mono text-[9px] text-muted-foreground/50 tracking-wider">
              Confidential — intended for the recipient only.
            </p>
          </footer>
        </div>
      </article>
    </>
  );
}
