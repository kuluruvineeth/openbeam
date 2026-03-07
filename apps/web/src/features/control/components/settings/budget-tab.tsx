"use client";

import { Button, Input, Label } from "@openbeam/ui";
import { useState } from "react";
import {
  useControlCostSummary,
  useUpdateBudget,
} from "../../hooks/use-control-costs";
import { MetricCard } from "../shared/metric-card";

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function BudgetTab() {
  const { data: summary } = useControlCostSummary();
  const updateMutation = useUpdateBudget();

  const [editing, setEditing] = useState(false);
  const [budgetDollars, setBudgetDollars] = useState("");

  const currentBudgetCents = 0;
  const spentCents = summary?.totalCostCents ?? 0;

  function handleSave() {
    const cents = Math.round(Number(budgetDollars) * 100);
    if (cents <= 0) {
      return;
    }
    updateMutation.mutate(
      { budgetMonthlyCents: cents },
      {
        onSuccess: () => {
          setEditing(false);
          setBudgetDollars("");
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          detail="Monthly limit"
          label="Budget"
          value={`$${centsToDollars(currentBudgetCents)}`}
        />
        <MetricCard
          detail="This month"
          label="Spent"
          value={`$${centsToDollars(spentCents)}`}
        />
        <MetricCard
          detail={
            currentBudgetCents > 0
              ? `${Math.round((spentCents / currentBudgetCents) * 100)}% used`
              : "No budget set"
          }
          label="Utilization"
          value={
            currentBudgetCents > 0
              ? `${Math.round((spentCents / currentBudgetCents) * 100)}%`
              : "-"
          }
        />
      </div>

      {editing ? (
        <div className="max-w-xs space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Monthly Budget ($)</Label>
            <Input
              onChange={(e) => setBudgetDollars(e.target.value)}
              placeholder={centsToDollars(currentBudgetCents)}
              type="number"
              value={budgetDollars}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={!budgetDollars || updateMutation.isPending}
              onClick={handleSave}
              size="sm"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={() => {
                setEditing(false);
                setBudgetDollars("");
              }}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setEditing(true)} size="sm" variant="outline">
          Edit Budget
        </Button>
      )}
    </div>
  );
}
