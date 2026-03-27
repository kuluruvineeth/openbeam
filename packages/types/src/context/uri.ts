import { z } from "zod";

export const ContextUriSchema = z
  .string()
  .refine((val) => val.startsWith("openbeam://"), {
    message: "Context URI must start with openbeam://",
  });

export type ContextUri = z.infer<typeof ContextUriSchema>;
