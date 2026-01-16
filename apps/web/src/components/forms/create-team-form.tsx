"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@openplane/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v3";
import { revalidateAfterTeamChange } from "@/actions/revalidate-action";
import { SubmitButton } from "@/components/submit-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateTeam } from "@/hooks/use-team";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Team name must be at least 2 characters.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTeamForm() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittedRef = useRef(false);
  const { mutateAsync: createTeam } = useCreateTeam();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const isFormLocked = isLoading || isSubmittedRef.current;

  async function onSubmit(values: FormValues) {
    if (isFormLocked) {
      console.warn("Team creation form submission blocked - form is locked", {
        isFormLocked,
        isLoading,
        isSubmittedRef: isSubmittedRef.current,
        formValues: values,
      });
      return;
    }

    const submissionId = `form_submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${submissionId}] Team creation form submission started`, {
      teamName: values.name,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    setIsLoading(true);

    try {
      const team = await createTeam({
        name: values.name,
      });

      console.log(`[${submissionId}] Team creation form submission succeeded`, {
        teamName: values.name,
        teamId: team.id,
        slug: team.slug,
        timestamp: new Date().toISOString(),
      });

      isSubmittedRef.current = true;
      await queryClient.invalidateQueries();
      await revalidateAfterTeamChange();
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        console.log(
          `[${submissionId}] Team creation completed successfully - redirecting to home`
        );
        return;
      }

      isSubmittedRef.current = false;
      console.error(`[${submissionId}] Team creation form submission failed`, {
        error,
        teamName: values.name,
      });

      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="mt-4 w-full">
              <FormLabel className="font-normal text-muted-foreground text-xs">
                Team name
              </FormLabel>
              <FormControl>
                <Input
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  autoFocus
                  placeholder="Ex: Engineering Team or Marketing"
                  spellCheck="false"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton
          className="mt-6 w-full"
          isSubmitting={isFormLocked}
          type="submit"
        >
          Create
        </SubmitButton>
      </form>
    </Form>
  );
}
