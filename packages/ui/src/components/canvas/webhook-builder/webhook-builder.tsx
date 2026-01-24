"use client";

import { forwardRef, memo, useCallback, useId, useMemo, useState } from "react";
import { cn } from "../../../utils/cn";
import { Badge } from "../../badge";
import { Button } from "../../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Label } from "../../label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../../select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../tooltip";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type AuthMethod = "none" | "hmac-sha256" | "bearer" | "basic" | "api-key";

interface WebhookConfig {
  path: string;
  method: HttpMethod;
  authentication: AuthMethod;
  secret?: string;
  signatureHeader?: string;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  allowedIps?: string[];
}

interface WebhookBuilderProps {
  value?: Partial<WebhookConfig>;
  onChange: (config: WebhookConfig) => void;
  baseUrl?: string;
  className?: string;
}

const HTTP_METHODS: { value: HttpMethod; label: string; color: string }[] = [
  { value: "GET", label: "GET", color: "text-emerald-500" },
  { value: "POST", label: "POST", color: "text-blue-500" },
  { value: "PUT", label: "PUT", color: "text-amber-500" },
  { value: "PATCH", label: "PATCH", color: "text-purple-500" },
  { value: "DELETE", label: "DELETE", color: "text-red-500" },
];

const AUTH_METHODS: {
  value: AuthMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "hmac-sha256",
    label: "HMAC-SHA256",
    description: "Recommended. Signature-based verification",
  },
  {
    value: "bearer",
    label: "Bearer Token",
    description: "Token in Authorization header",
  },
  {
    value: "api-key",
    label: "API Key",
    description: "Key in custom header",
  },
  {
    value: "basic",
    label: "Basic Auth",
    description: "Username and password",
  },
  {
    value: "none",
    label: "None",
    description: "No authentication (not recommended)",
  },
];

const RATE_LIMIT_PRESETS = [
  { label: "10 / minute", requests: 10, windowMs: 60_000 },
  { label: "60 / minute", requests: 60, windowMs: 60_000 },
  { label: "100 / minute", requests: 100, windowMs: 60_000 },
  { label: "1000 / hour", requests: 1000, windowMs: 3_600_000 },
];

const labelStyles = "text-xs text-muted-foreground";

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateWebhookPath(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getSecretLabel(authentication: AuthMethod): string {
  switch (authentication) {
    case "hmac-sha256":
      return "Signing Secret";
    case "bearer":
      return "Bearer Token";
    case "api-key":
      return "API Key";
    default:
      return "Secret";
  }
}

interface CopyButtonProps {
  value: string;
  className?: string;
}

const CopyButton = memo(function CopyButtonInner({
  value,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn("size-7", className)}
            onClick={handleCopy}
            size="icon"
            type="button"
            variant="ghost"
          >
            {copied ? (
              <Icons.Check className="size-3.5 text-emerald-500" />
            ) : (
              <Icons.Copy className="size-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{copied ? "Copied!" : "Copy"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

interface SecretFieldProps {
  value: string;
  onRegenerate: () => void;
  label?: string;
}

const SecretField = memo(function SecretFieldInner({
  value,
  onRegenerate,
  label = "Secret",
}: SecretFieldProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const maskedValue = useMemo(() => {
    if (!value) {
      return "";
    }
    return `${value.slice(0, 8)}${"•".repeat(24)}${value.slice(-8)}`;
  }, [value]);

  return (
    <div className="space-y-1.5">
      <Label className={labelStyles} htmlFor={id}>
        {label}
      </Label>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Input
            className="h-9 pr-16 font-mono text-xs"
            id={id}
            readOnly
            value={visible ? value : maskedValue}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            <Button
              className="size-7"
              onClick={() => setVisible(!visible)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Icons.Eye
                className={cn("size-3.5", visible && "text-primary")}
              />
            </Button>
            <CopyButton value={value} />
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-9 shrink-0"
                onClick={onRegenerate}
                size="icon"
                type="button"
                variant="outline"
              >
                <Icons.RefreshCw className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Regenerate secret</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Store this securely. It won't be shown again after you leave.
      </p>
    </div>
  );
});

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section = memo(function SectionInner({
  title,
  description,
  children,
  defaultOpen = true,
}: SectionProps) {
  return (
    <Collapsible
      className="border-border/50 border-b last:border-b-0"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-0 py-3 text-left [&[data-state=open]>svg]:rotate-180">
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>
        <Icons.ChevronDown className="size-4 text-muted-foreground transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="space-y-4 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
});

export const WebhookBuilder = memo(
  forwardRef<HTMLDivElement, WebhookBuilderProps>(
    function WebhookBuilderComponent(
      {
        value,
        onChange,
        baseUrl = "https://api.openplane.io/webhooks",
        className,
      },
      ref
    ) {
      const webhookUrlId = useId();
      const signatureHeaderId = useId();
      const requestsId = useId();
      const windowId = useId();
      const allowedIpsId = useId();

      const [defaults] = useState(() => ({
        path: generateWebhookPath(),
        secret: generateSecret(),
      }));

      const config: WebhookConfig = useMemo(
        () => ({
          path: value?.path ?? defaults.path,
          method: value?.method ?? "POST",
          authentication: value?.authentication ?? "hmac-sha256",
          secret: value?.secret ?? defaults.secret,
          signatureHeader: value?.signatureHeader ?? "X-Webhook-Signature",
          rateLimit: value?.rateLimit,
          allowedIps: value?.allowedIps,
        }),
        [value, defaults]
      );

      const webhookUrl = useMemo(
        () => `${baseUrl}/${config.path}`,
        [baseUrl, config.path]
      );

      const updateConfig = useCallback(
        (updates: Partial<WebhookConfig>) => {
          onChange({ ...config, ...updates });
        },
        [config, onChange]
      );

      const handleRegeneratePath = useCallback(() => {
        updateConfig({ path: generateWebhookPath() });
      }, [updateConfig]);

      const handleRegenerateSecret = useCallback(() => {
        updateConfig({ secret: generateSecret() });
      }, [updateConfig]);

      const selectedMethod = useMemo(
        () => HTTP_METHODS.find((m) => m.value === config.method),
        [config.method]
      );

      const selectedAuth = useMemo(
        () => AUTH_METHODS.find((a) => a.value === config.authentication),
        [config.authentication]
      );

      const selectedRateLimit = useMemo(() => {
        if (!config.rateLimit) {
          return null;
        }
        return RATE_LIMIT_PRESETS.find(
          (p) =>
            p.requests === config.rateLimit?.requests &&
            p.windowMs === config.rateLimit?.windowMs
        );
      }, [config.rateLimit]);

      return (
        <div className={cn("space-y-0", className)} ref={ref}>
          <Section defaultOpen title="Endpoint">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className={labelStyles} htmlFor={webhookUrlId}>
                  Webhook URL
                </Label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      className="h-9 pr-8 font-mono text-xs"
                      id={webhookUrlId}
                      readOnly
                      value={webhookUrl}
                    />
                    <div className="absolute inset-y-0 right-1 flex items-center">
                      <CopyButton value={webhookUrl} />
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="size-9 shrink-0"
                          onClick={handleRegeneratePath}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Icons.RefreshCw className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Generate new URL</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className={cn("font-medium", labelStyles)}>
                  HTTP Method
                </span>
                <Select
                  onValueChange={(v) =>
                    updateConfig({ method: v as HttpMethod })
                  }
                  value={config.method}
                >
                  <SelectTrigger className="h-9 w-32">
                    <span className={cn("font-mono", selectedMethod?.color)}>
                      {config.method}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <span className={cn("font-mono", method.color)}>
                          {method.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          <Section
            defaultOpen
            description="Verify incoming requests"
            title="Authentication"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className={cn("font-medium", labelStyles)}>Method</span>
                <Select
                  onValueChange={(v) =>
                    updateConfig({ authentication: v as AuthMethod })
                  }
                  value={config.authentication}
                >
                  <SelectTrigger className="h-9">
                    <span>{selectedAuth?.label}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_METHODS.map((auth) => (
                      <SelectItem
                        className="py-2"
                        key={auth.value}
                        value={auth.value}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{auth.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {auth.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.authentication !== "none" && config.secret && (
                <SecretField
                  label={getSecretLabel(config.authentication)}
                  onRegenerate={handleRegenerateSecret}
                  value={config.secret}
                />
              )}

              {config.authentication === "hmac-sha256" && (
                <div className="space-y-1.5">
                  <Label className={labelStyles} htmlFor={signatureHeaderId}>
                    Signature Header
                  </Label>
                  <Input
                    className="h-9 font-mono text-xs"
                    id={signatureHeaderId}
                    onChange={(e) =>
                      updateConfig({ signatureHeader: e.target.value })
                    }
                    placeholder="X-Webhook-Signature"
                    value={config.signatureHeader ?? "X-Webhook-Signature"}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Header name where the HMAC signature will be expected
                  </p>
                </div>
              )}
            </div>
          </Section>

          <Section
            defaultOpen={false}
            description="Protect against abuse"
            title="Rate Limiting"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {RATE_LIMIT_PRESETS.map((preset) => {
                  const isSelected =
                    config.rateLimit?.requests === preset.requests &&
                    config.rateLimit?.windowMs === preset.windowMs;
                  return (
                    <Badge
                      className={cn(
                        "cursor-pointer select-none transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                          : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/50"
                      )}
                      key={preset.label}
                      onClick={() =>
                        updateConfig({
                          rateLimit: {
                            requests: preset.requests,
                            windowMs: preset.windowMs,
                          },
                        })
                      }
                      role="button"
                      tabIndex={0}
                      variant="outline"
                    >
                      {preset.label}
                    </Badge>
                  );
                })}
                <Badge
                  className={cn(
                    "cursor-pointer select-none transition-colors",
                    config.rateLimit
                      ? "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/50"
                      : "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                  onClick={() => updateConfig({ rateLimit: undefined })}
                  role="button"
                  tabIndex={0}
                  variant="outline"
                >
                  Unlimited
                </Badge>
              </div>

              {config.rateLimit && !selectedRateLimit && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={labelStyles} htmlFor={requestsId}>
                      Requests
                    </Label>
                    <Input
                      className="h-9"
                      id={requestsId}
                      min={1}
                      onChange={(e) =>
                        updateConfig({
                          rateLimit: {
                            requests: Number.parseInt(e.target.value, 10) || 1,
                            windowMs: config.rateLimit?.windowMs ?? 60_000,
                          },
                        })
                      }
                      type="number"
                      value={config.rateLimit.requests}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelStyles} htmlFor={windowId}>
                      Window (seconds)
                    </Label>
                    <Input
                      className="h-9"
                      id={windowId}
                      min={1}
                      onChange={(e) =>
                        updateConfig({
                          rateLimit: {
                            requests: config.rateLimit?.requests ?? 100,
                            windowMs:
                              (Number.parseInt(e.target.value, 10) || 60) *
                              1000,
                          },
                        })
                      }
                      type="number"
                      value={(config.rateLimit.windowMs ?? 60_000) / 1000}
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section
            defaultOpen={false}
            description="Restrict by IP address"
            title="IP Allowlist"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className={labelStyles} htmlFor={allowedIpsId}>
                  Allowed IPs
                </Label>
                <Input
                  className="h-9 font-mono text-xs"
                  id={allowedIpsId}
                  onChange={(e) => {
                    const ips = e.target.value
                      .split(",")
                      .map((ip) => ip.trim())
                      .filter(Boolean);
                    updateConfig({
                      allowedIps: ips.length > 0 ? ips : undefined,
                    });
                  }}
                  placeholder="192.168.1.1, 10.0.0.0/8"
                  value={config.allowedIps?.join(", ") ?? ""}
                />
                <p className="text-[11px] text-muted-foreground">
                  Comma-separated list of IPs or CIDR ranges. Leave empty to
                  allow all.
                </p>
              </div>

              {config.allowedIps && config.allowedIps.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {config.allowedIps.map((ip) => (
                    <Badge
                      className="gap-1 pr-1"
                      key={ip}
                      variant="tag-rounded"
                    >
                      {ip}
                      <button
                        className="rounded-sm text-muted-foreground transition-colors hover:bg-secondary-foreground/10 hover:text-foreground"
                        onClick={() => {
                          const newIps = config.allowedIps?.filter(
                            (i) => i !== ip
                          );
                          updateConfig({
                            allowedIps:
                              newIps && newIps.length > 0 ? newIps : undefined,
                          });
                        }}
                        type="button"
                      >
                        <Icons.Close className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Section>
        </div>
      );
    }
  )
);

WebhookBuilder.displayName = "WebhookBuilder";
