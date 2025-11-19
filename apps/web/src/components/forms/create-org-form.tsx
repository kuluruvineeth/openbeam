"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { revalidateAfterOrganizationChange } from "@/actions/revalidate-action";
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
import { useCreateOrganization } from "@/hooks/use-organization";
import { authClient } from "@/lib/auth/client";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Organization name must be at least 2 characters.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateOrgForm() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittedRef = useRef(false);
  const { mutateAsync: createOrganization } = useCreateOrganization();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const isFormLocked = isLoading || isSubmittedRef.current;

  async function onSubmit(values: FormValues) {
    if (isFormLocked) {
      console.warn(
        "Organization creation form submission blocked - form is locked",
        {
          isFormLocked,
          isLoading,
          isSubmittedRef: isSubmittedRef.current,
          formValues: values,
        }
      );
      return;
    }

    const submissionId = `form_submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(
      `[${submissionId}] Organization creation form submission started`,
      {
        organizationName: values.name,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }
    );

    setIsLoading(true);

    try {
      const organization = await createOrganization({ name: values.name });

      if (organization?.data?.id) {
        // Set the newly created organization as active
        await authClient.organization.setActive({
          organizationId: organization.data.id,
        });
      }

      console.log(
        `[${submissionId}] Organization creation form submission succeeded`,
        {
          organizationName: values.name,
          organization,
          timestamp: new Date().toISOString(),
        }
      );

      // Lock the form permanently on success
      isSubmittedRef.current = true;

      // Invalidate queries so organization-aware UI refreshes
      await queryClient.invalidateQueries();

      // Revalidate server paths and redirect (may throw NEXT_REDIRECT)
      await revalidateAfterOrganizationChange();
    } catch (error) {
      // NEXT_REDIRECT is the expected behavior when redirecting in Next.js
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        console.log(
          `[${submissionId}] Organization creation completed successfully - redirecting to home`
        );
        return;
      }

      isSubmittedRef.current = false;
      console.error(
        `[${submissionId}] Organization creation form submission failed`,
        {
          error,
          organizationName: values.name,
        }
      );

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
                Organization name
              </FormLabel>
              <FormControl>
                <Input
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  autoFocus
                  placeholder="Ex: Open Startup or OpenPlane Inc."
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
