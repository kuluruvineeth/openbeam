FROM oven/bun:1.3.2 AS pruner
WORKDIR /app
RUN bun add -g turbo@2.5.4
COPY . .
RUN turbo prune web --docker

FROM us-central1-docker.pkg.dev/openplane-478413/openplane-repo/openplane-base:latest AS deps
WORKDIR /app
COPY --from=pruner /app/out/full/ .
ARG HUGEICONS_PRO_AUTH_TOKEN
RUN if [ -n "$HUGEICONS_PRO_AUTH_TOKEN" ]; then \
      printf "@hugeicons-pro:registry=https://npm.hugeicons.com/\n//npm.hugeicons.com/:_authToken=%s\n" "$HUGEICONS_PRO_AUTH_TOKEN" > .npmrc; \
    fi
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --no-progress && rm -f .npmrc

FROM deps AS prisma
WORKDIR /app
RUN cd packages/db && bun run db:generate

FROM prisma AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN bun run --filter=web build

FROM oven/bun:1.3.2 AS runner
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
