"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openplane/ui";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";
import { Icons } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { useUpdateSyncSettings, useWebhookStatus } from "../hooks/use-sync";
import type { SyncJobInfo } from "../lib/sync-types";

const INCREMENTAL_INTERVALS = [
  { label: "Every minute", value: 60 * 1000 },
  { label: "5 minutes", value: 5 * 60 * 1000 },
  { label: "15 minutes", value: 15 * 60 * 1000 },
  { label: "30 minutes", value: 30 * 60 * 1000 },
  { label: "1 hour", value: 60 * 60 * 1000 },
  { label: "6 hours", value: 6 * 60 * 60 * 1000 },
  { label: "12 hours", value: 12 * 60 * 60 * 1000 },
  { label: "Daily", value: 24 * 60 * 60 * 1000 },
] as const;

const FULL_INTERVALS = [
  { label: "Every hour", value: 60 * 60 * 1000 },
  { label: "Every 6 hours", value: 6 * 60 * 60 * 1000 },
  { label: "Daily", value: 24 * 60 * 60 * 1000 },
  { label: "Every 3 days", value: 3 * 24 * 60 * 60 * 1000 },
  { label: "Weekly", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "Every 2 weeks", value: 14 * 24 * 60 * 60 * 1000 },
  { label: "Monthly", value: 30 * 24 * 60 * 60 * 1000 },
] as const;

const formSchema = z
  .object({
    incrementalInterval: z.number().min(60_000),
    fullInterval: z.number().min(60_000),
  })
  .refine((data) => data.incrementalInterval < data.fullInterval, {
    message: "Must be less than full sync interval",
    path: ["incrementalInterval"],
  });

type FormValues = z.infer<typeof formSchema>;

type SyncSettingsFormProps = {
  connectorId: string;
  fullSyncJob: SyncJobInfo | null;
  incrementalSyncJob: SyncJobInfo | null;
};

function WebhookStatusRow({
  isLoading,
  enabled,
  lastReceivedAt,
}: {
  isLoading: boolean;
  enabled?: boolean;
  lastReceivedAt?: string | Date | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 pt-2">
        <Icons.Spinner className="size-3 animate-spin text-foreground/30" />
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="flex items-center gap-2 pt-2 text-[11px]">
        <Icons.Webhook className="size-3 text-openplane-green" />
        <span className="text-openplane-green">Real-time active</span>
        {lastReceivedAt && (
          <span className="text-foreground/35">
            ·{" "}
            {formatDistanceToNow(new Date(lastReceivedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pt-2 text-[11px] text-foreground/35">
      <Icons.Webhook className="size-3" />
      <span>Webhooks not configured</span>
    </div>
  );
}

export function SyncSettingsForm({
  connectorId,
  fullSyncJob,
  incrementalSyncJob,
}: SyncSettingsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      incrementalInterval:
        (incrementalSyncJob?.config?.intervalMs as number) ||
        6 * 60 * 60 * 1000,
      fullInterval:
        (fullSyncJob?.config?.intervalMs as number) || 7 * 24 * 60 * 60 * 1000,
    },
  });

  const updateSettings = useUpdateSyncSettings({
    onSuccess: () => {
      form.reset(form.getValues());
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const webhookStatus = useWebhookStatus(connectorId);

  async function onSubmit(values: FormValues) {
    await updateSettings.mutateAsync({
      connectorId,
      incrementalSyncIntervalMs: values.incrementalInterval,
      fullSyncIntervalMs: values.fullInterval,
    });
  }

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="incrementalInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-normal text-foreground/60 text-xs">
                Incremental sync
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? "")}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INCREMENTAL_INTERVALS.map((interval) => (
                    <SelectItem
                      key={interval.value}
                      value={interval.value.toString()}
                    >
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-normal text-foreground/60 text-xs">
                Full sync
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value ?? "")}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FULL_INTERVALS.map((interval) => (
                    <SelectItem
                      key={interval.value}
                      value={interval.value.toString()}
                    >
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <WebhookStatusRow
          enabled={webhookStatus.data?.enabled}
          isLoading={webhookStatus.isLoading}
          lastReceivedAt={webhookStatus.data?.lastReceivedAt}
        />

        <div className="flex justify-end pt-4">
          <SubmitButton
            disabled={!form.formState.isDirty}
            isSubmitting={updateSettings.isPending}
            type="submit"
          >
            Save
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
