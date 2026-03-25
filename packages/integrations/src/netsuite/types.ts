import { z } from "zod";

export const NetsuiteValidationResponseSchema = z.object({
  valid: z.boolean(),
  accountName: z.string().optional(),
});

export type NetsuiteValidationResponse = z.infer<
  typeof NetsuiteValidationResponseSchema
>;

export type NetsuiteAuthResult = {
  accountId: string;
  accountName: string;
};
