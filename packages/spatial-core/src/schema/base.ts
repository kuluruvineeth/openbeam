import { customAlphabet } from "nanoid";
import { z } from "zod";
import { CameraSchema } from "./camera";

const customId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export const Material = z.string().optional();

export const generateId = <T extends string>(prefix: T): `${T}_${string}` =>
  `${prefix}_${customId()}` as `${T}_${string}`;

export const objectId = <T extends string>(prefix: T) => {
  const schema = z.templateLiteral([`${prefix}_`, z.string()]);
  return schema.default(() => generateId(prefix) as z.infer<typeof schema>);
};

export const nodeType = <T extends string>(type: T) =>
  z.literal(type).default(type as never);

export const BaseNode = z.object({
  object: z.literal("node").default("node"),
  id: z.string(),
  type: nodeType("node"),
  name: z.string().optional(),
  parentId: z.string().nullable().default(null),
  visible: z.boolean().optional().default(true),
  camera: CameraSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export type BaseNode = z.infer<typeof BaseNode>;
