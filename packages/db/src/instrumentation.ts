// TODO: Check back tracing after Bun supports OpenTelemetry
import { SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("openplane-prisma");

function completeSpanSuccess(
  span: ReturnType<typeof tracer.startSpan>,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  span.setAttributes({
    "db.duration_ms": duration,
    "db.status": "success",
  });
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

function completeSpanError(
  span: ReturnType<typeof tracer.startSpan>,
  startTime: number,
  error: unknown
): void {
  const duration = Date.now() - startTime;
  span.setAttributes({
    "db.duration_ms": duration,
    "db.status": "error",
    "error.type": error instanceof Error ? error.constructor.name : "Unknown",
  });
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
  span.recordException(error as Error);
  span.end();
}

function wrapOperation<T>(
  span: ReturnType<typeof tracer.startSpan>,
  opFn: () => T,
  startTime: number
): T {
  try {
    const result = opFn();

    if (result instanceof Promise) {
      return result
        .then((value) => {
          completeSpanSuccess(span, startTime);
          return value;
        })
        .catch((error) => {
          completeSpanError(span, startTime, error);
          throw error;
        }) as T;
    }

    completeSpanSuccess(span, startTime);
    return result;
  } catch (error) {
    completeSpanError(span, startTime, error);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instrumentPrisma<T>(prisma: T): T {
  return new Proxy(prisma as object, {
    // biome-ignore lint/suspicious/noExplicitAny: Proxy needs dynamic access
    get(target: any, prop: string | symbol) {
      const original = target[prop];

      if (
        typeof original === "object" &&
        original !== null &&
        !["$connect", "$disconnect", "$on", "$transaction", "$use"].includes(
          prop as string
        )
      ) {
        return new Proxy(original as object, {
          get(modelTarget, operationKey) {
            const modelOperation =
              modelTarget[operationKey as keyof typeof modelTarget];

            if (typeof modelOperation === "function") {
              return (...operationArgs: unknown[]) => {
                const modelName = prop as string;
                const operationName = operationKey as string;
                const spanName = `prisma.${modelName}.${operationName}`;

                const span = tracer.startSpan(spanName, {
                  attributes: {
                    "db.system": "postgresql",
                    "db.name": process.env.DATABASE_NAME || "openplane",
                    "db.operation": operationName,
                    "db.prisma.model": modelName,
                  },
                });

                const startTime = Date.now();

                return wrapOperation(
                  span,
                  () => {
                    const modelMethod = modelOperation as (
                      ...args: unknown[]
                    ) => unknown;
                    return modelMethod.apply(modelTarget, operationArgs);
                  },
                  startTime
                );
              };
            }

            return modelOperation;
          },
        });
      }

      if (prop === "$transaction") {
        return ((...transactionArgs: unknown[]) => {
          const span = tracer.startSpan("prisma.transaction", {
            attributes: {
              "db.system": "postgresql",
              "db.name": process.env.DATABASE_NAME || "openplane",
              "db.operation": "transaction",
            },
          });

          const startTime = Date.now();

          return wrapOperation(
            span,
            () => {
              const transactionMethod = original as (
                ...args: unknown[]
              ) => unknown;
              return transactionMethod.apply(target, transactionArgs);
            },
            startTime
          );
        }) as typeof original;
      }

      return original;
    },
  }) as T;
}
