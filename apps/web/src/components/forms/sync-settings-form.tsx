"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Icons } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSyncSettings, useWebhookStatus } from "@/hooks/use-sync";
import type { SyncJobInfo } from "@/lib/sync-types";

// Sync interval options (in milliseconds)
// Note: BullMQ cron patterns require minimum 1 minute intervals
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
    incrementalInterval: z.number().min(60_000, {
      message: "Incremental sync interval must be at least 1 minute",
    }),
    fullInterval: z.number().min(60_000, {
      message: "Full sync interval must be at least 1 minute",
    }),
  })
  .refine((data) => data.incrementalInterval < data.fullInterval, {
    message: "Incremental sync interval must be less than full sync interval",
    path: ["incrementalInterval"],
  });

type FormValues = z.infer<typeof formSchema>;

interface SyncSettingsFormProps {
  connectorId: string;
  fullSyncJob: SyncJobInfo | null;
  incrementalSyncJob: SyncJobInfo | null;
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
    },
    onError: (error) => {
      console.error("Failed to update sync settings:", error);
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

  const isFormDirty = form.formState.isDirty;
  const isSubmitting = updateSettings.isPending;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Incremental Sync Settings */}
            <FormField
              control={form.control}
              name="incrementalInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Icons.RefreshCw className="h-4 w-4 text-muted-foreground" />
                    Incremental Sync Schedule
                  </FormLabel>
                  <FormDescription>
                    Fetch only new and updated data since the last sync. More
                    frequent syncs keep your data fresh.
                  </FormDescription>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
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

            {/* Full Sync Settings */}
            <FormField
              control={form.control}
              name="fullInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Icons.Database className="h-4 w-4 text-muted-foreground" />
                    Full Sync Schedule
                  </FormLabel>
                  <FormDescription>
                    Re-index all data from scratch. Ensures data consistency and
                    catches any missed changes.
                  </FormDescription>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
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

            {/* Webhook Status Section */}
            <div className="space-y-2 border-t pt-4">
              <FormLabel>
                <Icons.Webhook className="h-4 w-4 text-muted-foreground" />
                Real-time Updates (Webhooks)
              </FormLabel>
              <FormDescription>
                Receive instant updates when data changes in the source.
                Webhooks trigger immediate incremental syncs.
              </FormDescription>

              {webhookStatus.isLoading && (
                <div className="flex items-center gap-2 py-2 text-sm">
                  <Icons.Spinner className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">
                    Loading status...
                  </span>
                </div>
              )}

              {!webhookStatus.isLoading && webhookStatus.data?.enabled && (
                <Alert>
                  <Icons.CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Webhooks Active</p>
                      {webhookStatus.data.lastReceivedAt && (
                        <p className="text-muted-foreground text-xs">
                          Last received:{" "}
                          {formatDistanceToNow(
                            new Date(webhookStatus.data.lastReceivedAt),
                            {
                              addSuffix: true,
                            }
                          )}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!(webhookStatus.isLoading || webhookStatus.data?.enabled) && (
                <Alert>
                  <Icons.Info className="h-4 w-4" />
                  <AlertDescription>
                    Webhooks are not configured. Configure webhooks in your
                    source application to enable real-time updates.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end border-t pt-4">
            <SubmitButton
              disabled={!isFormDirty}
              isSubmitting={isSubmitting}
              type="submit"
            >
              Save Settings
            </SubmitButton>
          </div>
        </form>
      </Form>

      {/* Success/Error Messages */}
      {updateSettings.isSuccess && (
        <Alert>
          <Icons.CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            Sync settings updated successfully! Changes will take effect on the
            next scheduled sync.
          </AlertDescription>
        </Alert>
      )}

      {updateSettings.isError && (
        <Alert variant="destructive">
          <Icons.AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to update sync settings. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
