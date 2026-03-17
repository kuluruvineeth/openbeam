FROM oven/bun:1.3.3 AS pruner
WORKDIR /app
RUN bun add -g turbo@2.5.4
COPY . .
RUN turbo prune @openbeam/website --docker

FROM ghcr.io/kuluruvineeth/openbeam-base:latest AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
ARG HUGEICONS_PRO_AUTH_TOKEN
RUN if [ -n "$HUGEICONS_PRO_AUTH_TOKEN" ]; then \
      printf "@hugeicons-pro:registry=https://npm.hugeicons.com/\n//npm.hugeicons.com/:_authToken=%s\n" "$HUGEICONS_PRO_AUTH_TOKEN" > .npmrc; \
    fi
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --no-progress && rm -f .npmrc
COPY --from=pruner /app/out/full/ .

FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DOCKER_BUILD=1
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV SKIP_ENV_VALIDATION=true
RUN bun run --filter=@openbeam/website build

FROM oven/bun:1.3.3 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3002 \
    HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/public ./apps/website/public
USER nextjs
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3002/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["bun", "run", "apps/website/server.js"]
