FROM oven/bun:1.3.2 AS pruner
WORKDIR /app
RUN bun add -g turbo@2.5.4
COPY . .
RUN turbo prune sandbox-gateway --docker

FROM oven/bun:1.3.2 AS deps
WORKDIR /app
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --no-progress

FROM deps AS builder
WORKDIR /app
RUN bun run --filter=sandbox-gateway build

FROM oven/bun:1.3.2 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/turbo.json ./
COPY --from=deps --chown=nodejs:nodejs /app/bun.lock ./bun.lock
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/apps/sandbox-gateway ./apps/sandbox-gateway
WORKDIR /app/apps/sandbox-gateway
USER nodejs
EXPOSE 3800
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3800/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["bun", "run", "dist/index.js"]
