import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { Button } from "@openbeam/ui/components/button";
import { Input } from "@openbeam/ui/components/input";
import { Label } from "@openbeam/ui/components/label";
import { useState } from "react";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { ConnectorField } from "./types";

type ApiKeyStepProps = {
  app: McpApp;
  connector: { id: string; name: string; category?: string };
  fields: ConnectorField[];
  onComplete: (connectorId: string) => void;
  onError: (message: string) => void;
};

export function ApiKeyStep({
  app,
  connector,
  fields,
  onComplete,
  onError,
}: ApiKeyStepProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !values[field.id]?.trim()) {
        nextErrors[field.id] = `${field.label} is required`;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await app.callServerTool({
        name: "connector_configure",
        arguments: {
          app: connector.id,
          credentials: values,
        },
      });

      const sc = result.structuredContent as
        | { connectorId?: string; status?: string }
        | undefined;

      if (result.isError || !sc?.connectorId) {
        const text = result.content?.[0];
        onError(
          (text && "text" in text ? text.text : null) ?? "Configuration failed"
        );
        return;
      }

      onComplete(sc.connectorId);
    } catch {
      onError("Configuration failed");
    }
    setSubmitting(false);
  };

  const setFieldValue = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 border-border/50 border-b pb-3">
        <ConnectorLogo size={32} type={connector.id} />
        <div>
          <p className="font-medium text-sm">{connector.name}</p>
          <p className="text-[10px] text-foreground/40">
            {connector.category ?? "API Key"} · Enter your credentials
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <div className="flex flex-col gap-1.5" key={field.id}>
            <Label className="text-foreground/70 text-xs" htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </Label>
            {field.type === "select" ? (
              <select
                className="h-9 rounded-sm border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/10"
                id={field.id}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                value={values[field.id] ?? ""}
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                className="h-9 rounded-sm border-border/50"
                id={field.id}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? undefined}
                type={field.type === "password" ? "password" : "text"}
                value={values[field.id] ?? ""}
              />
            )}
            {errors[field.id] && (
              <p className="text-[11px] text-destructive">{errors[field.id]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-border/50 border-t pt-3">
        <Button
          className="w-full rounded-sm"
          disabled={submitting}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? "Connecting..." : `Connect ${connector.name}`}
        </Button>
        <p className="text-center text-[10px] text-foreground/30">
          Credentials encrypted at rest · Revoke access anytime
        </p>
      </div>
    </div>
  );
}
