FROM openbeamdevacr.azurecr.io/oven/bun:1.3.3 AS pruner
WORKDIR /app
RUN bun add -g turbo@2.5.4
COPY . .
RUN turbo prune web --docker

FROM openbeamdevacr.azurecr.io/openbeam-base:latest AS deps
WORKDIR /app
COPY --from=pruner /app/out/full/ .
ARG HUGEICONS_PRO_AUTH_TOKEN
RUN if [ -n "$HUGEICONS_PRO_AUTH_TOKEN" ]; then \
      printf "@hugeicons-pro:registry=https://npm.hugeicons.com/\n//npm.hugeicons.com/:_authToken=%s\n" "$HUGEICONS_PRO_AUTH_TOKEN" > .npmrc; \
    fi
RUN bun install --no-progress --linker hoisted && rm -f .npmrc

FROM deps AS prisma
WORKDIR /app
RUN cd packages/db && bun run db:generate

FROM prisma AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ARG NEXT_PUBLIC_WEB_URL=http://localhost:3001
ARG SERVER_INTERNAL_URL=http://localhost:3000
ARG NEXT_PUBLIC_POSTHOG_KEY=placeholder
ARG NEXT_PUBLIC_POSTHOG_HOST=http://localhost:3001
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_PUBLIC_WEB_URL=${NEXT_PUBLIC_WEB_URL} \
    SERVER_INTERNAL_URL=${SERVER_INTERNAL_URL} \
    NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY} \
    NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST} \
    NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=true \
    DOCKER_BUILD=1
RUN bun run --filter=web build

FROM openbeamdevacr.azurecr.io/oven/bun:1.3.3 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME="0.0.0.0"
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3001/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["bun", "run", "apps/web/server.js"]
