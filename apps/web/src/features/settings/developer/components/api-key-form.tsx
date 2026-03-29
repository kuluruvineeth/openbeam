"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@openbeam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import type { ScopePreset } from "../lib/scopes";
import {
  EXPIRATION_OPTIONS,
  SCOPE_RESOURCES,
  scopePresetToScopes,
  scopesToPreset,
} from "../lib/scopes";
import { ScopeSelector } from "./scope-selector";

type ApiKeyFormProps = {
  defaultValues?: {
    id?: string;
    name?: string;
    scopes?: string[];
  };
  onSubmit: (values: {
    name: string;
    scopes: string[];
    expiresAt?: Date;
  }) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export function ApiKeyForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Create",
}: ApiKeyFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [scopes, setScopes] = useState<string[]>(
    defaultValues?.scopes ?? scopePresetToScopes("all_access")
  );
  const [expirationDays, setExpirationDays] = useState<string>("90");

  const isEditing = Boolean(defaultValues?.id);

  const preset = useMemo(() => scopesToPreset(scopes), [scopes]);

  const handlePresetChange = useCallback((value: string) => {
    const next = value as ScopePreset;
    if (next === "restricted") {
      return;
    }
    setScopes(scopePresetToScopes(next));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        return;
      }

      let expiresAt: Date | undefined;
      if (!isEditing) {
        const days = expirationDays === "never" ? null : Number(expirationDays);
        if (days) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
        }
      }

      onSubmit({ name: name.trim(), scopes, expiresAt });
    },
    [name, scopes, expirationDays, isEditing, onSubmit]
  );

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="api-key-name">Name</Label>
        <Input
          autoFocus
          id="api-key-name"
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Production API Key"
          value={name}
        />
      </div>

      {!isEditing && (
        <div className="space-y-1.5">
          <Label htmlFor="api-key-expiration">Expiration</Label>
          <Select onValueChange={setExpirationDays} value={expirationDays}>
            <SelectTrigger id="api-key-expiration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRATION_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.days ?? "never"}
                  value={opt.days?.toString() ?? "never"}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Permissions</Label>
        <Tabs onValueChange={handlePresetChange} value={preset}>
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="all_access">
              All Access
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="read_only">
              Read Only
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="restricted">
              Restricted
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <AnimatePresence initial={false}>
          {preset === "restricted" && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              style={{ overflow: "hidden" }}
              transition={{ duration: 0.2 }}
            >
              <ScopeSelector
                onChange={setScopes}
                resources={SCOPE_RESOURCES}
                selectedScopes={scopes}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end">
        <Button disabled={!name.trim() || isSubmitting} type="submit">
          {isSubmitting && (
            <Icons.Loader2 className="mr-1.5 animate-spin" size={14} />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
