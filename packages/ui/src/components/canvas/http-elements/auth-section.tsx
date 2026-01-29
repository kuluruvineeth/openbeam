"use client";

import type { HttpAuthConfig, HttpAuthType } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useState } from "react";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Label } from "../../label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";

const AUTH_TYPE_LABELS: Record<HttpAuthType, string> = {
  none: "None",
  basic: "Basic Auth",
  bearer: "Bearer Token",
  api_key: "API Key",
  oauth2: "OAuth 2.0",
  custom_header: "Custom Header",
};

const AUTH_TYPES: HttpAuthType[] = [
  "none",
  "basic",
  "bearer",
  "api_key",
  "oauth2",
  "custom_header",
];

interface AuthFieldsProps {
  auth: HttpAuthConfig;
  updateField: (field: keyof HttpAuthConfig, value: string) => void;
  disabled?: boolean;
}

function PasswordInput({
  disabled,
  onChange,
  placeholder,
  value,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        className="h-8 pr-8 font-mono text-xs"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        type="button"
      >
        {visible ? (
          <Icons.EyeOff className="size-3.5" />
        ) : (
          <Icons.Eye className="size-3.5" />
        )}
      </button>
    </div>
  );
}

function BasicAuthFields({ auth, updateField, disabled }: AuthFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Username</Label>
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => updateField("username", e.target.value)}
          placeholder="Username"
          value={auth.username ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Password</Label>
        <PasswordInput
          disabled={disabled}
          onChange={(v) => updateField("password", v)}
          placeholder="Password"
          value={auth.password ?? ""}
        />
      </div>
    </div>
  );
}

function BearerAuthFields({ auth, updateField, disabled }: AuthFieldsProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Token</Label>
      <PasswordInput
        disabled={disabled}
        onChange={(v) => updateField("token", v)}
        placeholder="Bearer token"
        value={auth.token ?? ""}
      />
    </div>
  );
}

function ApiKeyAuthFields({ auth, updateField, disabled }: AuthFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Key Name</Label>
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => updateField("apiKeyName", e.target.value)}
          placeholder="X-API-Key"
          value={auth.apiKeyName ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Key Value</Label>
        <PasswordInput
          disabled={disabled}
          onChange={(v) => updateField("apiKeyValue", v)}
          placeholder="API key value"
          value={auth.apiKeyValue ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Send In</Label>
        <Select
          disabled={disabled}
          onValueChange={(v) => updateField("apiKeyLocation", v)}
          value={auth.apiKeyLocation ?? "header"}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="header">Header</SelectItem>
            <SelectItem value="query">Query Parameter</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function OAuth2AuthFields({ auth, updateField, disabled }: AuthFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Token URL</Label>
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => updateField("oauth2TokenUrl", e.target.value)}
          placeholder="https://auth.example.com/oauth/token"
          value={auth.oauth2TokenUrl ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Client ID</Label>
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => updateField("oauth2ClientId", e.target.value)}
          placeholder="Client ID"
          value={auth.oauth2ClientId ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Client Secret</Label>
        <PasswordInput
          disabled={disabled}
          onChange={(v) => updateField("oauth2ClientSecret", v)}
          placeholder="Client secret"
          value={auth.oauth2ClientSecret ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Scopes</Label>
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => updateField("oauth2Scopes", e.target.value)}
          placeholder="read write (space-separated)"
          value={auth.oauth2Scopes ?? ""}
        />
      </div>
    </div>
  );
}

function CustomHeaderAuthFields({
  auth,
  updateField,
  disabled,
}: AuthFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs">Header Name</Label>
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => updateField("customHeaderName", e.target.value)}
          placeholder="X-Custom-Auth"
          value={auth.customHeaderName ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Header Value</Label>
        <PasswordInput
          disabled={disabled}
          onChange={(v) => updateField("customHeaderValue", v)}
          placeholder="Header value"
          value={auth.customHeaderValue ?? ""}
        />
      </div>
    </div>
  );
}

const AUTH_FIELD_COMPONENTS: Partial<
  Record<HttpAuthType, React.ComponentType<AuthFieldsProps>>
> = {
  basic: BasicAuthFields,
  bearer: BearerAuthFields,
  api_key: ApiKeyAuthFields,
  oauth2: OAuth2AuthFields,
  custom_header: CustomHeaderAuthFields,
};

interface AuthSectionProps {
  auth: HttpAuthConfig;
  onChange: (auth: HttpAuthConfig) => void;
  disabled?: boolean;
}

export const AuthSection = memo(
  forwardRef<HTMLDivElement, AuthSectionProps>(function AuthSectionComponent(
    { auth, onChange, disabled },
    ref
  ) {
    const handleTypeChange = useCallback(
      (type: string) => {
        onChange({ ...auth, type: type as HttpAuthType });
      },
      [auth, onChange]
    );

    const updateField = useCallback(
      (field: keyof HttpAuthConfig, value: string) => {
        onChange({ ...auth, [field]: value });
      },
      [auth, onChange]
    );

    const FieldComponent = AUTH_FIELD_COMPONENTS[auth.type];

    return (
      <div className="space-y-3" ref={ref}>
        <div className="space-y-1.5">
          <Label className="text-xs">Auth Type</Label>
          <Select
            disabled={disabled}
            onValueChange={handleTypeChange}
            value={auth.type}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTH_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {AUTH_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AnimatedSizeContainer height>
          {FieldComponent && (
            <FieldComponent
              auth={auth}
              disabled={disabled}
              updateField={updateField}
            />
          )}
        </AnimatedSizeContainer>
      </div>
    );
  })
);

AuthSection.displayName = "AuthSection";
