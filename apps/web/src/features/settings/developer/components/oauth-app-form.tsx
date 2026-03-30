"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Input,
  Label,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@openbeam/ui";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import type { ScopePreset } from "../lib/scopes";
import {
  SCOPE_RESOURCES,
  scopePresetToScopes,
  scopesToPreset,
} from "../lib/scopes";
import { ScopeSelector } from "./scope-selector";

type OAuthAppFormValues = {
  name: string;
  description?: string;
  developerName?: string;
  website?: string;
  installUrl?: string;
  redirectUris: string[];
  scopes: string[];
  isPublic?: boolean;
  active?: boolean;
};

type OAuthAppFormProps = {
  defaultValues?: Partial<OAuthAppFormValues> & { id?: string };
  onSubmit: (values: OAuthAppFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function OAuthAppForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Create",
}: OAuthAppFormProps) {
  const isEditing = Boolean(defaultValues?.id);

  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(
    defaultValues?.description ?? ""
  );
  const [developerName, setDeveloperName] = useState(
    defaultValues?.developerName ?? ""
  );
  const [website, setWebsite] = useState(defaultValues?.website ?? "");
  const [installUrl, setInstallUrl] = useState(defaultValues?.installUrl ?? "");
  const [redirectUris, setRedirectUris] = useState<string[]>(
    defaultValues?.redirectUris?.length ? defaultValues.redirectUris : [""]
  );
  const [scopes, setScopes] = useState<string[]>(
    defaultValues?.scopes ?? scopePresetToScopes("all_access")
  );
  const [active, setActive] = useState(defaultValues?.active ?? true);

  const preset = useMemo(() => scopesToPreset(scopes), [scopes]);

  const handlePresetChange = useCallback((value: string) => {
    const next = value as ScopePreset;
    if (next === "restricted") {
      return;
    }
    setScopes(scopePresetToScopes(next));
  }, []);

  const handleAddUri = useCallback(() => {
    setRedirectUris((prev) => [...prev, ""]);
  }, []);

  const handleRemoveUri = useCallback((index: number) => {
    setRedirectUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUriChange = useCallback((index: number, value: string) => {
    setRedirectUris((prev) =>
      prev.map((uri, i) => (i === index ? value : uri))
    );
  }, []);

  const validUris = redirectUris.filter((uri) => isValidUrl(uri));
  const canSubmit =
    name.trim().length > 0 && validUris.length > 0 && !isSubmitting;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) {
        return;
      }
      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        developerName: developerName.trim() || undefined,
        website: website.trim() || undefined,
        installUrl: installUrl.trim() || undefined,
        redirectUris: validUris,
        scopes,
        active,
      });
    },
    [
      name,
      description,
      developerName,
      website,
      installUrl,
      validUris,
      scopes,
      active,
      canSubmit,
      onSubmit,
    ]
  );

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Accordion
        className="w-full"
        defaultValue={["general", "redirects", "permissions"]}
        type="multiple"
      >
        <AccordionItem value="general">
          <AccordionTrigger className="text-sm">General</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="oauth-app-name">Name</Label>
                <Input
                  autoFocus
                  id="oauth-app-name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My OAuth Application"
                  value={name}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oauth-app-description">Description</Label>
                <Textarea
                  className="min-h-[72px] resize-none"
                  id="oauth-app-description"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this application do?"
                  value={description}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oauth-app-developer">Developer Name</Label>
                <Input
                  id="oauth-app-developer"
                  onChange={(e) => setDeveloperName(e.target.value)}
                  placeholder="Acme Inc."
                  value={developerName}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oauth-app-website">Website URL</Label>
                <Input
                  id="oauth-app-website"
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  value={website}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oauth-app-install-url">Install URL</Label>
                <Input
                  id="oauth-app-install-url"
                  onChange={(e) => setInstallUrl(e.target.value)}
                  placeholder="https://example.com/install"
                  type="url"
                  value={installUrl}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="redirects">
          <AccordionTrigger className="text-sm">Redirect URIs</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-1">
              {redirectUris.map((uri, index) => (
                <div className="flex items-center gap-2" key={index}>
                  <Input
                    className="flex-1"
                    onChange={(e) => handleUriChange(index, e.target.value)}
                    placeholder="https://example.com/callback"
                    type="url"
                    value={uri}
                  />
                  {redirectUris.length > 1 && (
                    <Button
                      className="shrink-0"
                      onClick={() => handleRemoveUri(index)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Icons.Trash size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                className="w-full"
                onClick={handleAddUri}
                size="sm"
                type="button"
                variant="outline"
              >
                <Icons.Plus size={14} />
                Add Redirect URI
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="permissions">
          <AccordionTrigger className="text-sm">Permissions</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-1">
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="settings">
          <AccordionTrigger className="text-sm">Settings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-1">
              {isEditing && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Active</p>
                    <p className="text-muted-foreground text-xs">
                      Disable to temporarily block all OAuth access
                    </p>
                  </div>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end pt-2">
        <Button disabled={!canSubmit} type="submit">
          {isSubmitting && (
            <Icons.Loader2 className="mr-1.5 animate-spin" size={14} />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export type { OAuthAppFormValues, OAuthAppFormProps };
