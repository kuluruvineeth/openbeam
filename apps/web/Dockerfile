FROM oven/bun:1.3.2 AS base

FROM base AS deps
WORKDIR /app

# Install build dependencies for native modules (argon2)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/server/package.json ./apps/server/
COPY apps/worker/package.json ./apps/worker/
COPY apps/fumadocs/package.json apps/fumadocs/source.config.ts ./apps/fumadocs/
COPY apps/fumadocs/content ./apps/fumadocs/content

ARG HUGEICONS_PRO_AUTH_TOKEN
RUN if [ -n "$HUGEICONS_PRO_AUTH_TOKEN" ]; then \
      echo "@hugeicons-pro:registry=https://npm.hugeicons.com/\n//npm.hugeicons.com/:_authToken=$HUGEICONS_PRO_AUTH_TOKEN" > .npmrc; \
    fi

ENV HUSKY=0
RUN bun install

WORKDIR /app/packages/db
RUN bun run db:generate

FROM deps AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN bun run --filter=web build

FROM base AS runner
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
