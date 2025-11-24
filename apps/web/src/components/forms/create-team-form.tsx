"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { useCreateTeam } from "@/hooks/use-team";
import { useTRPC } from "@/trpc/client";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Team name must be at least 2 characters.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTeamForm() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
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
      // TODO: Implement team creation via tRPC
      // For now, this is a placeholder
      const { slug } = await trpc.team.generateSlug.mutate({
        name: values.name,
      });

      // TODO: Create team and set as active
      // await trpc.team.create.mutate({ name: values.name, slug });
      // await trpc.team.switch.mutate({ teamId: team.id });

      console.log(`[${submissionId}] Team creation form submission succeeded`, {
        teamName: values.name,
        slug,
        timestamp: new Date().toISOString(),
      });

      // Lock the form permanently on success
      isSubmittedRef.current = true;

      // Invalidate queries so team-aware UI refreshes
      await queryClient.invalidateQueries();

      // Revalidate server paths and redirect (may throw NEXT_REDIRECT)
      await revalidateAfterTeamChange();
    } catch (error) {
      // NEXT_REDIRECT is the expected behavior when redirecting in Next.js
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
              <FormLabel className="font-normal text-[#666] text-xs">
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
