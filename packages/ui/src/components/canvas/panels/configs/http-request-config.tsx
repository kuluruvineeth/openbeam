"use client";

import type {
  HttpAuthConfig,
  HttpBodyType,
  HttpMethod,
  HttpRequestNodeConfig,
  HttpResponseHandling,
  HttpRetryConfig,
  KeyValuePair,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo, useState } from "react";
import { AnimatedSizeContainer } from "../../../animated-size-container";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import { Label } from "../../../label";
import { Slider } from "../../../slider";
import { Switch } from "../../../switch";
import {
  AuthSection,
  BodyEditor,
  BodyTypeSelector,
  HeaderEditor,
  QueryParamEditor,
  ResponseSection,
  UrlBar,
} from "../../http-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const METHODS_WITH_BODY = new Set<HttpMethod>(["POST", "PUT", "PATCH"]);

const TIMEOUT_OPTIONS = [
  { value: 1000, label: "1s" },
  { value: 5000, label: "5s" },
  { value: 10_000, label: "10s" },
  { value: 30_000, label: "30s" },
  { value: 60_000, label: "1m" },
  { value: 120_000, label: "2m" },
  { value: 300_000, label: "5m" },
];

function formatTimeout(ms: number): string {
  if (ms < 60_000) {
    return `${ms / 1000}s`;
  }
  return `${ms / 60_000}m`;
}

interface RetryTimeoutSectionProps {
  config: HttpRequestNodeConfig;
  retry: HttpRetryConfig;
  timeoutMs: number;
  disabled: boolean;
  onChange: (config: Partial<HttpRequestNodeConfig>) => void;
  onRetryChange: (retry: HttpRetryConfig) => void;
  onTimeoutChange: (values: number[]) => void;
}

function RetryTimeoutSection({
  config,
  retry,
  timeoutMs,
  disabled,
  onChange,
  onRetryChange,
  onTimeoutChange,
}: RetryTimeoutSectionProps) {
  return (
    <div className="space-y-4">
      <ConfigField
        label="Timeout"
        tooltip="Maximum time to wait for a response"
      >
        <div className="space-y-2">
          <Slider
            disabled={disabled}
            max={TIMEOUT_OPTIONS.length - 1}
            min={0}
            onValueChange={onTimeoutChange}
            step={1}
            value={[
              Math.max(
                0,
                TIMEOUT_OPTIONS.findIndex((o) => o.value === timeoutMs)
              ),
            ]}
          />
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>1s</span>
            <span className="font-medium text-foreground">
              {formatTimeout(timeoutMs)}
            </span>
            <span>5m</span>
          </div>
        </div>
      </ConfigField>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">Retry on Failure</Label>
          <p className="text-muted-foreground text-xs">
            Automatically retry failed requests
          </p>
        </div>
        <Switch
          checked={retry.enabled}
          disabled={disabled}
          onCheckedChange={(enabled) => onRetryChange({ ...retry, enabled })}
        />
      </div>

      <AnimatedSizeContainer height>
        {retry.enabled && (
          <div className="space-y-3">
            <ConfigField label="Max Attempts">
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                max={10}
                min={1}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val >= 1 && val <= 10) {
                    onRetryChange({ ...retry, maxAttempts: val });
                  }
                }}
                type="number"
                value={retry.maxAttempts}
              />
            </ConfigField>

            <ConfigField
              label="Backoff"
              tooltip="Delay between retries in milliseconds"
            >
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                max={60_000}
                min={100}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val >= 100) {
                    onRetryChange({ ...retry, backoffMs: val });
                  }
                }}
                type="number"
                value={retry.backoffMs}
              />
            </ConfigField>

            <ConfigField
              label="Retry On Status Codes"
              tooltip="HTTP status codes that trigger a retry"
            >
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                onChange={(e) => {
                  const codes = e.target.value
                    .split(",")
                    .map((s) => Number.parseInt(s.trim(), 10))
                    .filter((n) => !Number.isNaN(n));
                  onRetryChange({ ...retry, retryOn: codes });
                }}
                placeholder="429, 500, 502, 503, 504"
                value={retry.retryOn?.join(", ") ?? ""}
              />
            </ConfigField>
          </div>
        )}
      </AnimatedSizeContainer>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">Continue on Error</Label>
          <p className="text-muted-foreground text-xs">
            Don&apos;t fail the workflow on HTTP errors
          </p>
        </div>
        <Switch
          checked={config.continueOnError ?? false}
          disabled={disabled}
          onCheckedChange={(continueOnError) => onChange({ continueOnError })}
        />
      </div>
    </div>
  );
}

interface HttpRequestConfigPanelProps {
  config: HttpRequestNodeConfig;
  onChange: (config: Partial<HttpRequestNodeConfig>) => void;
}

export const HttpRequestConfigPanel = memo(
  forwardRef<HTMLDivElement, HttpRequestConfigPanelProps>(
    function HttpRequestConfigPanelComponent({ config, onChange }, ref) {
      const [isTestRunning, setIsTestRunning] = useState(false);

      const method = config.method ?? "GET";
      const hasBody = METHODS_WITH_BODY.has(method);
      const timeoutMs = config.timeoutMs ?? 30_000;
      const headers = config.headers ?? [];
      const queryParams = config.queryParams ?? [];
      const auth = config.auth ?? { type: "none" as const };
      const bodyType = config.bodyType ?? "none";
      const retry = config.retry ?? {
        enabled: true,
        maxAttempts: 3,
        backoffMs: 1000,
        retryOn: [429, 500, 502, 503, 504],
      };
      const response = config.response ?? {
        responseType: "auto" as const,
        followRedirects: true,
        maxRedirects: 10,
        validateCertificate: true,
        parseResponse: true,
      };

      const handleMethodChange = useCallback(
        (m: HttpMethod) => {
          const updates: Partial<HttpRequestNodeConfig> = { method: m };
          if (!METHODS_WITH_BODY.has(m)) {
            updates.bodyType = "none";
            updates.bodyContent = undefined;
            updates.bodyFormFields = undefined;
          }
          onChange(updates);
        },
        [onChange]
      );

      const handleUrlChange = useCallback(
        (url: string) => onChange({ url }),
        [onChange]
      );

      const handleAuthChange = useCallback(
        (a: HttpAuthConfig) => onChange({ auth: a }),
        [onChange]
      );

      const handleHeadersChange = useCallback(
        (h: KeyValuePair[]) => onChange({ headers: h }),
        [onChange]
      );

      const handleQueryParamsChange = useCallback(
        (p: KeyValuePair[]) => onChange({ queryParams: p }),
        [onChange]
      );

      const handleBodyTypeChange = useCallback(
        (t: HttpBodyType) => {
          const updates: Partial<HttpRequestNodeConfig> = { bodyType: t };
          if (t === "none") {
            updates.bodyContent = undefined;
            updates.bodyFormFields = undefined;
          }
          onChange(updates);
        },
        [onChange]
      );

      const handleBodyContentChange = useCallback(
        (bodyContent: string) => onChange({ bodyContent }),
        [onChange]
      );

      const handleBodyFormFieldsChange = useCallback(
        (bodyFormFields: KeyValuePair[]) => onChange({ bodyFormFields }),
        [onChange]
      );

      const handleResponseChange = useCallback(
        (r: HttpResponseHandling) => onChange({ response: r }),
        [onChange]
      );

      const handleRetryChange = useCallback(
        (r: HttpRetryConfig) => onChange({ retry: r }),
        [onChange]
      );

      const handleTimeoutChange = useCallback(
        (values: number[]) => {
          const idx = values[0];
          if (idx !== undefined) {
            const option = TIMEOUT_OPTIONS[idx];
            if (option) {
              onChange({ timeoutMs: option.value });
            }
          }
        },
        [onChange]
      );

      const handleSendTest = useCallback(async () => {
        setIsTestRunning(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } finally {
          setIsTestRunning(false);
        }
      }, []);

      const headerBadge = useMemo(() => {
        const enabled = headers.filter((h) => h.enabled && h.key);
        return enabled.length > 0 ? `${enabled.length}` : undefined;
      }, [headers]);

      const queryParamBadge = useMemo(() => {
        const enabled = queryParams.filter((p) => p.enabled && p.key);
        return enabled.length > 0 ? `${enabled.length}` : undefined;
      }, [queryParams]);

      const authBadge = useMemo(
        () => (auth.type !== "none" ? auth.type : undefined),
        [auth.type]
      );

      return (
        <div
          className="min-w-0 divide-y divide-border/50 overflow-hidden"
          ref={ref}
        >
          <ConfigSection
            defaultOpen
            icon={<Icons.Globe className="size-4" />}
            title="Request"
          >
            <div className="space-y-4">
              <ConfigField label="Endpoint">
                <UrlBar
                  disabled={isTestRunning}
                  method={method}
                  onMethodChange={handleMethodChange}
                  onUrlChange={handleUrlChange}
                  url={config.url ?? ""}
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            badge={authBadge}
            defaultOpen={false}
            icon={<Icons.LockIcon className="size-4" />}
            title="Authentication"
          >
            <AuthSection
              auth={auth}
              disabled={isTestRunning}
              onChange={handleAuthChange}
            />
          </ConfigSection>

          <ConfigSection
            badge={headerBadge}
            defaultOpen={false}
            icon={<Icons.FileText className="size-4" />}
            title="Headers"
          >
            <HeaderEditor
              disabled={isTestRunning}
              headers={headers}
              onChange={handleHeadersChange}
            />
          </ConfigSection>

          <ConfigSection
            badge={queryParamBadge}
            defaultOpen={false}
            icon={<Icons.HelpCircle className="size-4" />}
            title="Query Parameters"
          >
            <QueryParamEditor
              disabled={isTestRunning}
              onChange={handleQueryParamsChange}
              params={queryParams}
            />
          </ConfigSection>

          <AnimatedSizeContainer height>
            {hasBody && (
              <ConfigSection
                defaultOpen
                icon={<Icons.Package className="size-4" />}
                title="Body"
              >
                <div className="space-y-3">
                  <BodyTypeSelector
                    disabled={isTestRunning}
                    onChange={handleBodyTypeChange}
                    value={bodyType}
                  />
                  <BodyEditor
                    bodyContent={config.bodyContent ?? ""}
                    bodyFormFields={config.bodyFormFields ?? []}
                    bodyType={bodyType}
                    disabled={isTestRunning}
                    onContentChange={handleBodyContentChange}
                    onFormFieldsChange={handleBodyFormFieldsChange}
                  />
                </div>
              </ConfigSection>
            )}
          </AnimatedSizeContainer>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Download className="size-4" />}
            title="Response Handling"
          >
            <ResponseSection
              disabled={isTestRunning}
              onChange={handleResponseChange}
              response={response}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.RefreshCw className="size-4" />}
            title="Retry & Timeout"
          >
            <RetryTimeoutSection
              config={config}
              disabled={isTestRunning}
              onChange={onChange}
              onRetryChange={handleRetryChange}
              onTimeoutChange={handleTimeoutChange}
              retry={retry}
              timeoutMs={timeoutMs}
            />
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Play className="size-4" />}
            title="Test Request"
          >
            <div className="space-y-4">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                disabled={isTestRunning || !config.url}
                onClick={handleSendTest}
                type="button"
              >
                {isTestRunning ? (
                  <>
                    <Icons.Loader2 className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Icons.Play className="size-4" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

HttpRequestConfigPanel.displayName = "HttpRequestConfigPanel";
