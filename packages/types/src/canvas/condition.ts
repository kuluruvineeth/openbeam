import { z } from "zod";

export const ConditionDataTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "array",
  "object",
  "any",
]);

export type ConditionDataType = z.infer<typeof ConditionDataTypeSchema>;

export const ConditionOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
  "matches_regex",
  "greater_than",
  "less_than",
  "greater_or_equal",
  "less_or_equal",
  "is_between",
  "is_true",
  "is_false",
  "is_before",
  "is_after",
  "is_today",
  "is_in_past",
  "is_in_future",
  "date_between",
  "has_key",
  "key_equals",
  "array_contains",
  "array_not_contains",
  "array_length_equals",
  "array_length_greater",
  "array_length_less",
  "array_is_empty",
  "exists",
  "not_exists",
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const ConditionLogicSchema = z.enum(["and", "or"]);
export type ConditionLogic = z.infer<typeof ConditionLogicSchema>;

export const SingleConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  dataType: ConditionDataTypeSchema.default("string"),
  operator: ConditionOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  secondValue: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .nullable(),
});

export type SingleCondition = z.infer<typeof SingleConditionSchema>;

export const ConditionGroupSchema = z.object({
  id: z.string(),
  logic: ConditionLogicSchema.default("and"),
  conditions: z.array(SingleConditionSchema).default([]),
});

export type ConditionGroup = z.infer<typeof ConditionGroupSchema>;

export const ConditionBranchSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
  groups: z.array(ConditionGroupSchema).default([]),
});

export type ConditionBranch = z.infer<typeof ConditionBranchSchema>;

export const ConditionBuilderModeSchema = z.enum(["visual", "expression"]);
export type ConditionBuilderMode = z.infer<typeof ConditionBuilderModeSchema>;

export const AdvancedConditionConfigSchema = z.object({
  mode: ConditionBuilderModeSchema.default("visual"),
  expression: z.string().optional(),
  branches: z.array(ConditionBranchSchema).default([]),
  defaultBranchLabel: z.string().default("Default"),
  evaluationOrder: z.enum(["sequential", "parallel"]).default("sequential"),
});

export type AdvancedConditionConfig = z.infer<
  typeof AdvancedConditionConfigSchema
>;

export const OPERATORS_BY_TYPE: Record<ConditionDataType, ConditionOperator[]> =
  {
    string: [
      "equals",
      "not_equals",
      "contains",
      "not_contains",
      "starts_with",
      "ends_with",
      "is_empty",
      "is_not_empty",
      "matches_regex",
      "exists",
      "not_exists",
    ],
    number: [
      "equals",
      "not_equals",
      "greater_than",
      "less_than",
      "greater_or_equal",
      "less_or_equal",
      "is_between",
      "exists",
      "not_exists",
    ],
    boolean: ["is_true", "is_false", "exists", "not_exists"],
    date: [
      "equals",
      "not_equals",
      "is_before",
      "is_after",
      "is_today",
      "is_in_past",
      "is_in_future",
      "date_between",
      "exists",
      "not_exists",
    ],
    array: [
      "array_contains",
      "array_not_contains",
      "array_length_equals",
      "array_length_greater",
      "array_length_less",
      "array_is_empty",
      "exists",
      "not_exists",
    ],
    object: [
      "has_key",
      "key_equals",
      "is_empty",
      "is_not_empty",
      "exists",
      "not_exists",
    ],
    any: ["exists", "not_exists", "equals", "not_equals"],
  };

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  matches_regex: "matches regex",
  greater_than: "is greater than",
  less_than: "is less than",
  greater_or_equal: "is at least",
  less_or_equal: "is at most",
  is_between: "is between",
  is_true: "is true",
  is_false: "is false",
  is_before: "is before",
  is_after: "is after",
  is_today: "is today",
  is_in_past: "is in the past",
  is_in_future: "is in the future",
  date_between: "is between",
  has_key: "has key",
  key_equals: "key equals",
  array_contains: "contains",
  array_not_contains: "does not contain",
  array_length_equals: "length equals",
  array_length_greater: "length is greater than",
  array_length_less: "length is less than",
  array_is_empty: "is empty",
  exists: "exists",
  not_exists: "does not exist",
};

export const OPERATOR_NEEDS_VALUE: Record<ConditionOperator, boolean> = {
  equals: true,
  not_equals: true,
  contains: true,
  not_contains: true,
  starts_with: true,
  ends_with: true,
  is_empty: false,
  is_not_empty: false,
  matches_regex: true,
  greater_than: true,
  less_than: true,
  greater_or_equal: true,
  less_or_equal: true,
  is_between: true,
  is_true: false,
  is_false: false,
  is_before: true,
  is_after: true,
  is_today: false,
  is_in_past: false,
  is_in_future: false,
  date_between: true,
  has_key: true,
  key_equals: true,
  array_contains: true,
  array_not_contains: true,
  array_length_equals: true,
  array_length_greater: true,
  array_length_less: true,
  array_is_empty: false,
  exists: false,
  not_exists: false,
};

export const OPERATOR_NEEDS_SECOND_VALUE: Record<ConditionOperator, boolean> = {
  equals: false,
  not_equals: false,
  contains: false,
  not_contains: false,
  starts_with: false,
  ends_with: false,
  is_empty: false,
  is_not_empty: false,
  matches_regex: false,
  greater_than: false,
  less_than: false,
  greater_or_equal: false,
  less_or_equal: false,
  is_between: true,
  is_true: false,
  is_false: false,
  is_before: false,
  is_after: false,
  is_today: false,
  is_in_past: false,
  is_in_future: false,
  date_between: true,
  has_key: false,
  key_equals: false,
  array_contains: false,
  array_not_contains: false,
  array_length_equals: false,
  array_length_greater: false,
  array_length_less: false,
  array_is_empty: false,
  exists: false,
  not_exists: false,
};

export const DATA_TYPE_LABELS: Record<ConditionDataType, string> = {
  string: "Text",
  number: "Number",
  boolean: "Boolean",
  date: "Date",
  array: "List",
  object: "Object",
  any: "Any",
};

export const BRANCH_COLORS = [
  "var(--canvas-success)",
  "var(--openplane-blue)",
  "var(--openplane-yellow)",
  "var(--openplane-pink)",
  "var(--openplane-orange)",
  "var(--node-condition)",
] as const;
