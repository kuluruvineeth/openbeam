import type {
  ConditionBranch,
  ConditionGroup,
  ConditionOperator,
  SingleCondition,
} from "@openbeam/types/canvas";

type ConditionValue = string | number | boolean | null | undefined;

function getFieldValue(data: Record<string, unknown>, field: string): unknown {
  if (!field) {
    return;
  }
  const parts = field.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return;
    }
    if (typeof current !== "object") {
      return;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function evaluateStringOperator(
  fieldValue: unknown,
  operator: ConditionOperator,
  conditionValue: ConditionValue
): boolean {
  const str = String(fieldValue ?? "");
  const compareStr = String(conditionValue ?? "");

  switch (operator) {
    case "equals":
      return str === compareStr;
    case "not_equals":
      return str !== compareStr;
    case "contains":
      return str.includes(compareStr);
    case "not_contains":
      return !str.includes(compareStr);
    case "starts_with":
      return str.startsWith(compareStr);
    case "ends_with":
      return str.endsWith(compareStr);
    case "is_empty":
      return str.length === 0;
    case "is_not_empty":
      return str.length > 0;
    case "matches_regex": {
      try {
        const regex = new RegExp(compareStr);
        return regex.test(str);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function evaluateNumberOperator(
  fieldValue: unknown,
  operator: ConditionOperator,
  conditionValue: ConditionValue,
  secondValue: ConditionValue
): boolean {
  const num = toNumber(fieldValue);
  const compareNum = toNumber(conditionValue);

  if (num === null) {
    return false;
  }

  switch (operator) {
    case "equals":
      return compareNum !== null && num === compareNum;
    case "not_equals":
      return compareNum !== null && num !== compareNum;
    case "greater_than":
      return compareNum !== null && num > compareNum;
    case "less_than":
      return compareNum !== null && num < compareNum;
    case "greater_or_equal":
      return compareNum !== null && num >= compareNum;
    case "less_or_equal":
      return compareNum !== null && num <= compareNum;
    case "is_between": {
      const secondNum = toNumber(secondValue);
      if (compareNum === null || secondNum === null) {
        return false;
      }
      return num >= compareNum && num <= secondNum;
    }
    default:
      return false;
  }
}

function evaluateBooleanOperator(
  fieldValue: unknown,
  operator: ConditionOperator
): boolean {
  const bool = Boolean(fieldValue);

  switch (operator) {
    case "is_true":
      return bool === true;
    case "is_false":
      return bool === false;
    default:
      return false;
  }
}

function evaluateDateOperator(
  fieldValue: unknown,
  operator: ConditionOperator,
  conditionValue: ConditionValue,
  secondValue: ConditionValue
): boolean {
  const date = toDate(fieldValue);
  if (!date) {
    return false;
  }

  const now = new Date();
  const compareDate = toDate(conditionValue);

  switch (operator) {
    case "equals":
      return compareDate !== null && date.getTime() === compareDate.getTime();
    case "not_equals":
      return compareDate !== null && date.getTime() !== compareDate.getTime();
    case "is_before":
      return compareDate !== null && date.getTime() < compareDate.getTime();
    case "is_after":
      return compareDate !== null && date.getTime() > compareDate.getTime();
    case "is_today":
      return isToday(date);
    case "is_in_past":
      return date.getTime() < now.getTime();
    case "is_in_future":
      return date.getTime() > now.getTime();
    case "date_between": {
      const secondDate = toDate(secondValue);
      if (!(compareDate && secondDate)) {
        return false;
      }
      return (
        date.getTime() >= compareDate.getTime() &&
        date.getTime() <= secondDate.getTime()
      );
    }
    default:
      return false;
  }
}

function evaluateArrayOperator(
  fieldValue: unknown,
  operator: ConditionOperator,
  conditionValue: ConditionValue
): boolean {
  if (!Array.isArray(fieldValue)) {
    return operator === "array_is_empty";
  }

  const arr = fieldValue;
  const compareNum = toNumber(conditionValue);

  switch (operator) {
    case "array_contains":
      return arr.some(
        (item) =>
          item === conditionValue || String(item) === String(conditionValue)
      );
    case "array_not_contains":
      return !arr.some(
        (item) =>
          item === conditionValue || String(item) === String(conditionValue)
      );
    case "array_length_equals":
      return compareNum !== null && arr.length === compareNum;
    case "array_length_greater":
      return compareNum !== null && arr.length > compareNum;
    case "array_length_less":
      return compareNum !== null && arr.length < compareNum;
    case "array_is_empty":
      return arr.length === 0;
    default:
      return false;
  }
}

function evaluateObjectOperator(
  fieldValue: unknown,
  operator: ConditionOperator,
  conditionValue: ConditionValue
): boolean {
  if (
    fieldValue === null ||
    fieldValue === undefined ||
    typeof fieldValue !== "object" ||
    Array.isArray(fieldValue)
  ) {
    switch (operator) {
      case "is_empty":
        return true;
      case "is_not_empty":
        return false;
      default:
        return false;
    }
  }

  const obj = fieldValue as Record<string, unknown>;
  const key = String(conditionValue ?? "");

  switch (operator) {
    case "has_key":
      return key in obj;
    case "key_equals":
      return obj[key] !== undefined;
    case "is_empty":
      return Object.keys(obj).length === 0;
    case "is_not_empty":
      return Object.keys(obj).length > 0;
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: SingleCondition,
  data: Record<string, unknown>
): boolean {
  const fieldValue = getFieldValue(data, condition.field);
  const { operator, value, secondValue, dataType } = condition;

  if (operator === "exists") {
    return fieldValue !== undefined && fieldValue !== null;
  }
  if (operator === "not_exists") {
    return fieldValue === undefined || fieldValue === null;
  }

  switch (dataType) {
    case "string":
      return evaluateStringOperator(fieldValue, operator, value);
    case "number":
      return evaluateNumberOperator(fieldValue, operator, value, secondValue);
    case "boolean":
      return evaluateBooleanOperator(fieldValue, operator);
    case "date":
      return evaluateDateOperator(fieldValue, operator, value, secondValue);
    case "array":
      return evaluateArrayOperator(fieldValue, operator, value);
    case "object":
      return evaluateObjectOperator(fieldValue, operator, value);
    case "any":
      return evaluateStringOperator(fieldValue, operator, value);
    default:
      return false;
  }
}

export function evaluateGroup(
  group: ConditionGroup,
  data: Record<string, unknown>
): boolean {
  if (group.conditions.length === 0) {
    return true;
  }

  const results = group.conditions.map((condition) =>
    evaluateCondition(condition, data)
  );

  if (group.logic === "and") {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

export function evaluateBranch(
  branch: ConditionBranch,
  data: Record<string, unknown>
): boolean {
  if (branch.groups.length === 0) {
    return true;
  }

  return branch.groups.some((group) => evaluateGroup(group, data));
}

export function evaluateBranches(
  branches: ConditionBranch[],
  data: Record<string, unknown>
): string | null {
  for (const branch of branches) {
    if (evaluateBranch(branch, data)) {
      return branch.id;
    }
  }
  return null;
}
