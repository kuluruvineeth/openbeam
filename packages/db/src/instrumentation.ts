import { createLogger } from "@openplane/observability";
import { SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("openplane-prisma");
const logger = createLogger({
  service: "openplane-db",
  env: process.env.NODE_ENV || "development",
  level: process.env.LOG_LEVEL || "info",
  version: process.env.APP_VERSION || "0.1.0",
});
const DB_SYSTEM = "postgresql";
const DB_NAME = process.env.DATABASE_NAME || "openplane";
const EXCLUDED_PRISMA_METHODS = new Set([
  "$connect",
  "$disconnect",
  "$on",
  "$transaction",
  "$use",
]);

function coerceError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function completeSpanSuccess(
  span: ReturnType<typeof tracer.startSpan>,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  span.setAttributes({
    duration_ms: duration,
    status: "success",
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
    duration_ms: duration,
    status: "error",
    "error.type": error instanceof Error ? error.constructor.name : "Unknown",
  });
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
  span.recordException(coerceError(error));
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

export function instrumentPrisma<T extends object>(prisma: T): T {
  return new Proxy(prisma, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (
        typeof prop === "string" &&
        typeof original === "object" &&
        original !== null &&
        !EXCLUDED_PRISMA_METHODS.has(prop)
      ) {
        const modelTarget = original as Record<PropertyKey, unknown>;
        return new Proxy(modelTarget, {
          get(modelProxyTarget, operationKey, modelReceiver) {
            const modelOperation = Reflect.get(
              modelProxyTarget,
              operationKey,
              modelReceiver
            );

            if (typeof modelOperation === "function") {
              return (...operationArgs: unknown[]) => {
                const modelName = prop;
                const operationName = String(operationKey);
                const spanName = `prisma.${modelName}.${operationName}`;

                const span = tracer.startSpan(spanName, {
                  attributes: {
                    "db.system": DB_SYSTEM,
                    "db.name": DB_NAME,
                    "db.operation": operationName,
                    "db.model": modelName,
                  },
                });

                const startTime = Date.now();

                return wrapOperation(
                  span,
                  () =>
                    Reflect.apply(
                      modelOperation as (...args: unknown[]) => unknown,
                      modelProxyTarget,
                      operationArgs
                    ),
                  startTime
                );
              };
            }

            return modelOperation;
          },
        });
      }

      if (prop === "$transaction" && typeof original === "function") {
        return (...transactionArgs: unknown[]) => {
          const span = tracer.startSpan("prisma.transaction", {
            attributes: {
              "db.system": DB_SYSTEM,
              "db.name": DB_NAME,
              "db.operation": "transaction",
              "db.model": "transaction",
            },
          });

          const startTime = Date.now();

          return wrapOperation(
            span,
            () =>
              Reflect.apply(
                original as (...args: unknown[]) => unknown,
                target,
                transactionArgs
              ),
            startTime
          );
        };
      }

      return original;
    },
  });
}

export function logDatabaseInstrumentationError(error: unknown): void {
  logger.error(
    {
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error),
    },
    "Prisma instrumentation failed"
  );
}
