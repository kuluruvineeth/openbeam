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
  connector: { id: string; name: string };
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

  const handleSubmit = async () => {
    const missing = fields
      .filter((f) => f.required && !values[f.id]?.trim())
      .map((f) => f.label);

    if (missing.length > 0) {
      onError(`Missing: ${missing.join(", ")}`);
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
      <div className="flex items-center gap-3">
        <ConnectorLogo size={32} type={connector.id} />
        <div>
          <p className="font-medium text-sm">{connector.name}</p>
          <p className="text-[10px] text-foreground/40">API Key</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <div className="flex flex-col gap-1" key={field.id}>
            <label className="text-foreground/70 text-xs" htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </label>
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
          </div>
        ))}
      </div>

      <button
        className="rounded-sm bg-foreground px-4 py-2 font-medium text-background text-xs transition-colors hover:bg-foreground/90 disabled:opacity-50"
        disabled={submitting}
        onClick={handleSubmit}
        type="button"
      >
        {submitting ? "Configuring..." : "Connect"}
      </button>
    </div>
  );
}
