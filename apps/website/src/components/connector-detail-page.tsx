"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { ConnectorLogo } from "@/components/connector-logo";
import type { WebsiteConnector } from "@/data/connectors";
import {
  connectors,
  getCategoryName,
  getGroupForCategory,
} from "@/data/connectors";
import { cn } from "@/lib/cn";

interface Props {
  connector: WebsiteConnector;
}

const TABS = ["Overview", "Data Streams", "Setup"] as const;
type Tab = (typeof TABS)[number];

export function ConnectorDetailPage({ connector }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const categoryName = getCategoryName(connector.category);

  const relatedConnectors = connectors
    .filter((c) => c.category === connector.category && c.id !== connector.id)
    .slice(0, 3);

  return (
    <div className="pt-32 pb-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <nav className="mb-8">
          <ol className="flex items-center gap-2 font-sans text-sm">
            <li>
              <Link
                className="text-muted-foreground transition-colors hover:text-foreground"
                href="/connectors/"
              >
                Connectors
              </Link>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li>
              <Link
                className="text-muted-foreground transition-colors hover:text-foreground"
                href={`/connectors/?category=${encodeURIComponent(getGroupForCategory(connector.category))}`}
              >
                {categoryName}
              </Link>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li className="text-foreground">{connector.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-start gap-6">
              <ConnectorLogo
                appId={connector.id}
                className="h-16 w-16 lg:h-20 lg:w-20"
              />
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h1 className="font-serif text-3xl text-foreground lg:text-5xl">
                    {connector.name}
                  </h1>
                  {!connector.active && (
                    <span className="bg-secondary px-2 py-1 font-sans text-muted-foreground text-xs">
                      Coming soon
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-sans text-muted-foreground text-sm">
                  <span>{categoryName}</span>
                  {connector.active && (
                    <>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-emerald-500" />
                        Active
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8 h-px bg-border/40" />

            <div className="mb-8 flex gap-1 border-border/40 border-b">
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                const isDisabled =
                  tab === "Data Streams" && connector.streams.length === 0;

                return (
                  <button
                    className={cn(
                      "relative px-4 pt-1 pb-2.5 font-sans text-sm transition-colors",
                      isActive && "text-foreground",
                      !isActive &&
                        isDisabled &&
                        "cursor-not-allowed text-muted-foreground/40",
                      !(isActive || isDisabled) &&
                        "text-muted-foreground hover:text-foreground"
                    )}
                    disabled={isDisabled}
                    key={tab}
                    onClick={() => !isDisabled && setActiveTab(tab)}
                    type="button"
                  >
                    {tab}
                    {isActive && (
                      <motion.div
                        className="absolute right-0 bottom-0 left-0 h-[2px] bg-foreground"
                        layoutId="detail-tab-underline"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 40,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {activeTab === "Overview" && <OverviewTab connector={connector} />}
            {activeTab === "Data Streams" && (
              <DataStreamsTab connector={connector} />
            )}
            {activeTab === "Setup" && <SetupTab connector={connector} />}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
              <div className="border border-border p-6">
                <h3 className="mb-4 font-sans text-foreground text-lg">
                  {connector.active ? "Get started" : "Coming soon"}
                </h3>
                <p className="mb-6 font-sans text-muted-foreground text-sm">
                  {connector.active
                    ? `Deploy OpenBeam and connect ${connector.name} to start syncing and searching your data.`
                    : `The ${connector.name} connector is coming soon. Star the repo to stay updated.`}
                </p>
                <a
                  className="flex w-full items-center justify-center bg-primary px-6 py-3 font-sans text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                  href="https://docs.openbeam.work/quickstart"
                >
                  Deploy your instance
                </a>
              </div>

              <div className="border border-border p-6">
                <h3 className="mb-4 font-sans text-muted-foreground text-sm">
                  Details
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="font-sans text-muted-foreground text-xs">
                      Authentication
                    </dt>
                    <dd className="font-sans text-foreground text-sm">
                      {connector.auth_type.replace("_", " ")}
                    </dd>
                  </div>
                  {connector.developer && (
                    <div>
                      <dt className="font-sans text-muted-foreground text-xs">
                        Developer
                      </dt>
                      <dd className="font-sans text-foreground text-sm">
                        {connector.developer}
                      </dd>
                    </div>
                  )}
                  {connector.website && (
                    <div>
                      <dt className="font-sans text-muted-foreground text-xs">
                        Website
                      </dt>
                      <dd>
                        <a
                          className="font-sans text-foreground text-sm underline transition-colors hover:text-muted-foreground"
                          href={connector.website}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {new URL(connector.website).hostname}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {relatedConnectors.length > 0 && (
                <div className="border border-border p-6">
                  <h3 className="mb-4 font-sans text-muted-foreground text-sm">
                    Related connectors
                  </h3>
                  <div className="space-y-4">
                    {relatedConnectors.map((related) => (
                      <Link
                        className="group flex items-center gap-3"
                        href={`/connectors/${related.slug}/`}
                        key={related.id}
                      >
                        <ConnectorLogo appId={related.id} className="h-8 w-8" />
                        <span className="font-sans text-foreground text-sm transition-colors group-hover:text-muted-foreground">
                          {related.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ connector }: { connector: WebsiteConnector }) {
  return (
    <div>
      <p className="mb-8 font-sans text-foreground text-lg leading-relaxed">
        {connector.short_description}
      </p>
      {connector.description && (
        <div className="mb-12 border-border border-t pt-8">
          <p className="font-sans text-base text-muted-foreground leading-relaxed">
            {connector.description}
          </p>
        </div>
      )}

      {connector.features.length > 0 && (
        <div className="border border-border p-6 lg:p-8">
          <h2 className="mb-6 font-sans text-foreground text-lg">
            Key Features
          </h2>
          <ul className="space-y-4">
            {connector.features.map((feature) => (
              <li className="flex items-start gap-3" key={feature}>
                <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 bg-foreground" />
                <span className="font-sans text-base text-muted-foreground">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DataStreamsTab({ connector }: { connector: WebsiteConnector }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {connector.streams.map((stream) => (
        <div className="border border-border p-5" key={stream.name}>
          <h3 className="mb-1 font-medium font-sans text-foreground text-sm">
            {stream.label}
          </h3>
          <p className="font-sans text-muted-foreground text-sm">
            {stream.description}
          </p>
          <p className="mt-2 font-mono text-muted-foreground/60 text-xs">
            {stream.name}
          </p>
        </div>
      ))}
    </div>
  );
}

function SetupTab({ connector }: { connector: WebsiteConnector }) {
  const authLabel = connector.auth_type.replace(/_/g, " ");

  return (
    <div className="space-y-8">
      <div className="border border-border p-6">
        <h2 className="mb-4 font-sans text-foreground text-lg">
          Authentication
        </h2>
        <p className="mb-4 font-sans text-muted-foreground text-sm">
          {connector.name} uses{" "}
          <strong className="text-foreground">{authLabel}</strong> for
          authentication.{" "}
          {connector.active
            ? "Connect your account in the OpenBeam dashboard to get started."
            : "Authentication will be configured automatically once this connector is available."}
        </p>
      </div>

      <div className="border border-border p-6">
        <h2 className="mb-4 font-sans text-foreground text-lg">Quick Start</h2>
        <ol className="space-y-4">
          {[
            "Deploy your OpenBeam instance",
            `Navigate to Connectors and select ${connector.name}`,
            `Authenticate with your ${connector.name} account`,
            "Configure sync preferences and data streams",
            "Start syncing — your data will be searchable within minutes",
          ].map((step, i) => (
            <li className="flex items-start gap-3" key={step}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-border font-mono text-muted-foreground text-xs">
                {i + 1}
              </span>
              <span className="font-sans text-muted-foreground text-sm">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <a
        className="flex w-full items-center justify-center bg-foreground px-6 py-3 font-sans text-background text-sm transition-opacity hover:opacity-90"
        href="https://docs.openbeam.work/quickstart"
      >
        Deploy OpenBeam
      </a>
    </div>
  );
}
