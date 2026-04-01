import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useState } from "react";
import { ConnectorLogo } from "../../shared/connector-logo";

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
};

type ApiKeyStepProps = {
  app: McpApp;
  connector: { id: string; name: string; category?: string };
  fields: Field[];
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
    const newErrors: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !values[f.id]?.trim()) {
        newErrors[f.id] = `${f.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        | {
            connectorId?: string;
            status?: string;
          }
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
            <label
              className="font-medium text-foreground/70 text-xs"
              htmlFor={field.id}
            >
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </label>
            {field.type === "select" ? (
              <select
                className="rounded-sm border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/10"
                id={field.id}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.id]: e.target.value }))
                }
                value={values[field.id] ?? ""}
              >
                <option value="">Select...</option>
              </select>
            ) : (
              <input
                className="rounded-sm border border-border/50 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10"
                id={field.id}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.id]: e.target.value }))
                }
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
        <button
          className="w-full rounded-sm bg-foreground px-4 py-2 font-medium text-background text-xs transition-colors hover:bg-foreground/90 disabled:opacity-50"
          disabled={submitting}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? "Connecting..." : `Connect ${connector.name}`}
        </button>
        <p className="text-center text-[10px] text-foreground/30">
          Credentials encrypted at rest · Revoke access anytime
        </p>
      </div>
    </div>
  );
}
