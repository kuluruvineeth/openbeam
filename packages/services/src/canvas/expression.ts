import vm from "node:vm";
import jmespath from "jmespath";
import jsonata from "jsonata";

export type ExpressionLanguage = "jmespath" | "jsonata" | "javascript";

type ExpressionParams = {
  expression: string;
  language: ExpressionLanguage;
  data: unknown;
  context?: Record<string, unknown>;
  timeoutMs?: number;
};

type FunctionBodyParams = {
  body: string;
  args: string[];
  argValues: unknown[];
  context?: Record<string, unknown>;
  timeoutMs?: number;
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export async function evaluateExpression({
  expression,
  language,
  data,
  context,
  timeoutMs = 1000,
}: ExpressionParams): Promise<unknown> {
  if (!expression.trim()) {
    throw new Error("Expression is required");
  }

  switch (language) {
    case "jmespath":
      return jmespath.search(data, expression);

    case "jsonata": {
      const compiled = jsonata(expression);
      return await compiled.evaluate(data, context ?? {});
    }

    case "javascript": {
      const sandbox = {
        input: cloneValue(data),
        data: cloneValue(data),
        $input: cloneValue(data),
        $data: cloneValue(data),
        Math,
        JSON,
        ...(context ?? {}),
      };
      const script = new vm.Script(`"use strict"; (${expression})`);
      return script.runInNewContext(sandbox, { timeout: timeoutMs });
    }

    default:
      throw new Error(`Unsupported expression language: ${language}`);
  }
}

export function evaluateFunctionBody({
  body,
  args,
  argValues,
  context,
  timeoutMs = 1000,
}: FunctionBodyParams): unknown {
  if (!body.trim()) {
    throw new Error("Expression is required");
  }

  const argList = args.join(", ");
  const sandbox = {
    Math,
    JSON,
    ...(context ?? {}),
  };
  const script = new vm.Script(
    `"use strict"; (function(${argList}) { ${body} })`
  );
  const fn = script.runInNewContext(sandbox, { timeout: timeoutMs });

  if (typeof fn !== "function") {
    throw new Error("Expression did not compile to a function");
  }

  const clonedArgs = argValues.map((value) => cloneValue(value));
  return fn(...clonedArgs);
}
