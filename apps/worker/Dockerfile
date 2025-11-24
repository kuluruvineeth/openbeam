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
COPY apps/worker ./apps/worker
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/fumadocs/package.json apps/fumadocs/source.config.ts ./apps/fumadocs/
COPY apps/fumadocs/content ./apps/fumadocs/content

ENV HUSKY=0
# Install dependencies (scripts are needed to build native modules like argon2)
RUN bun install --frozen-lockfile

WORKDIR /app/packages/db
RUN bun run db:generate

FROM deps AS builder
WORKDIR /app
RUN bun run --filter=@openplane/worker build

FROM base AS runner
WORKDIR /app/apps/worker
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/bun.lock /app/turbo.json /app/
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/worker ./

EXPOSE 9091

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun run -e "fetch('http://localhost:9091/metrics').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["bun", "run", "dist/index.js"]
