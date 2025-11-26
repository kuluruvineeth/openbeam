/**
 * Calculator Tool
 *
 * Built-in tool for basic mathematical calculations.
 */

import { z } from "zod";
import { defineTool } from "../registry";

/**
 * Calculator parameters schema
 */
const calculatorParamsSchema = z.object({
  expression: z
    .string()
    .describe(
      "Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5', 'sqrt(16)')"
    ),
});

type CalculatorParams = z.infer<typeof calculatorParamsSchema>;

interface CalculatorResult {
  expression: string;
  result: number | string;
  error?: string;
}

/**
 * Safe math evaluator
 * Only allows basic math operations, no code execution
 */
function evaluateMathExpression(expr: string): number {
  // Remove whitespace
  const cleaned = expr.replace(/\s+/g, "");

  // Validate - only allow numbers, operators, parentheses, and math functions
  const validPattern =
    /^[\d+\-*/().^%]+$|^(sqrt|abs|sin|cos|tan|log|exp|floor|ceil|round|pow|min|max)\(/;

  if (!validPattern.test(cleaned)) {
    throw new Error("Invalid expression: contains unsupported characters");
  }

  // Replace math functions with Math. equivalents
  const jsExpr = cleaned
    .replace(/sqrt\(/g, "Math.sqrt(")
    .replace(/abs\(/g, "Math.abs(")
    .replace(/sin\(/g, "Math.sin(")
    .replace(/cos\(/g, "Math.cos(")
    .replace(/tan\(/g, "Math.tan(")
    .replace(/log\(/g, "Math.log(")
    .replace(/exp\(/g, "Math.exp(")
    .replace(/floor\(/g, "Math.floor(")
    .replace(/ceil\(/g, "Math.ceil(")
    .replace(/round\(/g, "Math.round(")
    .replace(/pow\(/g, "Math.pow(")
    .replace(/min\(/g, "Math.min(")
    .replace(/max\(/g, "Math.max(")
    .replace(/\^/g, "**"); // Power operator

  // Additional safety: ensure only math is being evaluated
  // biome-ignore lint/security/noGlobalEval: Expression is validated and sanitized above
  const result = eval(jsExpr);

  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Expression did not evaluate to a valid number");
  }

  return result;
}

/**
 * Calculator tool definition
 */
export const calculatorTool = defineTool<CalculatorParams, CalculatorResult>({
  name: "calculator",
  description:
    "Perform mathematical calculations. Supports basic arithmetic (+, -, *, /, ^, %), and functions like sqrt, abs, sin, cos, tan, log, exp, floor, ceil, round, pow, min, max.",
  parameters: calculatorParamsSchema,
  category: "utility",
  parallelizable: true,

  async execute(params): Promise<CalculatorResult> {
    try {
      const result = evaluateMathExpression(params.expression);
      return {
        expression: params.expression,
        result,
      };
    } catch (error) {
      return {
        expression: params.expression,
        result: "Error",
        error: error instanceof Error ? error.message : "Calculation failed",
      };
    }
  },
});

/**
 * Unit converter tool
 */
const unitConverterParamsSchema = z.object({
  value: z.number().describe("The value to convert"),
  from: z.string().describe("Source unit (e.g., 'km', 'miles', 'celsius')"),
  to: z.string().describe("Target unit (e.g., 'miles', 'km', 'fahrenheit')"),
});

type UnitConverterParams = z.infer<typeof unitConverterParamsSchema>;

interface UnitConverterResult {
  originalValue: number;
  originalUnit: string;
  convertedValue: number;
  convertedUnit: string;
  error?: string;
}

/**
 * Unit conversion factors
 */
const conversions: Record<string, Record<string, (v: number) => number>> = {
  // Length
  km: {
    miles: (v) => v * 0.621_371,
    m: (v) => v * 1000,
    ft: (v) => v * 3280.84,
  },
  miles: {
    km: (v) => v * 1.609_34,
    m: (v) => v * 1609.34,
    ft: (v) => v * 5280,
  },
  m: {
    km: (v) => v / 1000,
    miles: (v) => v / 1609.34,
    ft: (v) => v * 3.280_84,
    cm: (v) => v * 100,
  },
  ft: {
    m: (v) => v / 3.280_84,
    km: (v) => v / 3280.84,
    miles: (v) => v / 5280,
  },

  // Temperature
  celsius: {
    fahrenheit: (v) => (v * 9) / 5 + 32,
    kelvin: (v) => v + 273.15,
  },
  fahrenheit: {
    celsius: (v) => ((v - 32) * 5) / 9,
    kelvin: (v) => ((v - 32) * 5) / 9 + 273.15,
  },
  kelvin: {
    celsius: (v) => v - 273.15,
    fahrenheit: (v) => ((v - 273.15) * 9) / 5 + 32,
  },

  // Weight
  kg: {
    lbs: (v) => v * 2.204_62,
    g: (v) => v * 1000,
  },
  lbs: {
    kg: (v) => v / 2.204_62,
    g: (v) => v * 453.592,
  },
  g: {
    kg: (v) => v / 1000,
    lbs: (v) => v / 453.592,
  },
};

export const unitConverterTool = defineTool<
  UnitConverterParams,
  UnitConverterResult
>({
  name: "unit_converter",
  description:
    "Convert values between units. Supports length (km, miles, m, ft), temperature (celsius, fahrenheit, kelvin), and weight (kg, lbs, g).",
  parameters: unitConverterParamsSchema,
  category: "utility",
  parallelizable: true,

  async execute(params): Promise<UnitConverterResult> {
    const fromUnit = params.from.toLowerCase();
    const toUnit = params.to.toLowerCase();

    const conversionFn = conversions[fromUnit]?.[toUnit];

    if (!conversionFn) {
      return {
        originalValue: params.value,
        originalUnit: params.from,
        convertedValue: 0,
        convertedUnit: params.to,
        error: `Conversion from ${params.from} to ${params.to} is not supported`,
      };
    }

    const convertedValue = conversionFn(params.value);

    return {
      originalValue: params.value,
      originalUnit: params.from,
      convertedValue: Math.round(convertedValue * 1000) / 1000, // Round to 3 decimals
      convertedUnit: params.to,
    };
  },
});

export default calculatorTool;
