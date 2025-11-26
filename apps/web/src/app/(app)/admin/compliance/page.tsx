"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CompliancePage() {
  const [dataRetention, setDataRetention] = useState(true);
  const [retentionDays, setRetentionDays] = useState(365);
  const [auditSearches, setAuditSearches] = useState(true);
  const [dlpEnabled, setDlpEnabled] = useState(false);

  const handleSave = () => {
    // TODO: Implement via tRPC
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-f37-stout text-xl">Compliance Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure data retention, auditing, and compliance policies
        </p>
      </div>

      {/* Data Retention */}
      <section className="mb-8 border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Data Retention</h3>
            <p className="text-muted-foreground text-sm">
              Automatically delete old data after a specified period
            </p>
          </div>
          <button
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              dataRetention ? "bg-primary" : "bg-muted"
            )}
            onClick={() => setDataRetention(!dataRetention)}
            type="button"
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                dataRetention ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        </div>

        {dataRetention && (
          <div className="mt-4 border-border border-t pt-4">
            <label className="mb-2 block text-muted-foreground text-sm">
              Retention Period (days)
            </label>
            <select
              className="h-10 w-full border border-border bg-background px-3 text-sm"
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              value={retentionDays}
            >
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={1825}>5 years</option>
            </select>
          </div>
        )}
      </section>

      {/* Audit Logging */}
      <section className="mb-8 border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Audit All Searches</h3>
            <p className="text-muted-foreground text-sm">
              Log all search queries for compliance auditing
            </p>
          </div>
          <button
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              auditSearches ? "bg-primary" : "bg-muted"
            )}
            onClick={() => setAuditSearches(!auditSearches)}
            type="button"
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                auditSearches ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        </div>
      </section>

      {/* DLP */}
      <section className="mb-8 border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">
              Data Loss Prevention
            </h3>
            <p className="text-muted-foreground text-sm">
              Detect and prevent sensitive data exposure
            </p>
          </div>
          <button
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              dlpEnabled ? "bg-primary" : "bg-muted"
            )}
            onClick={() => setDlpEnabled(!dlpEnabled)}
            type="button"
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                dlpEnabled ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        </div>

        {dlpEnabled && (
          <div className="mt-4 border-border border-t pt-4">
            <p className="mb-4 text-muted-foreground text-sm">
              DLP rules detect patterns like credit card numbers, SSNs, and
              other sensitive data.
            </p>
            <Button variant="outline">
              <Icons.Plus className="mr-2" size={14} />
              Add DLP Rule
            </Button>
          </div>
        )}
      </section>

      {/* IP Allowlist */}
      <section className="mb-8 border border-border bg-background p-6">
        <h3 className="mb-2 font-medium text-foreground">IP Allowlist</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          Restrict access to specific IP addresses or ranges
        </p>
        <Button variant="outline">
          <Icons.Plus className="mr-2" size={14} />
          Add IP Range
        </Button>
      </section>

      {/* Save */}
      <Button className="w-full" onClick={handleSave}>
        Save Compliance Settings
      </Button>
    </div>
  );
}
