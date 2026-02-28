FROM oven/bun:1.3.2 AS pruner
WORKDIR /app
RUN bun add -g turbo@2.5.4
COPY . .
RUN turbo prune @openplane/worker --docker

FROM ghcr.io/kuluruvineeth/openplane-base:latest AS deps
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
RUN bun run --filter=@openplane/worker build

FROM oven/bun:1.3.2 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
COPY --from=builder /app/package.json /app/turbo.json ./
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker ./apps/worker
RUN mkdir -p apps/worker/node_modules/@openplane && \
    for pkg in packages/*/; do \
      name=$(basename "$pkg"); \
      rm -rf "apps/worker/node_modules/@openplane/$name" && \
      ln -s "../../../../packages/$name" "apps/worker/node_modules/@openplane/$name"; \
    done
RUN chown -R nodejs:nodejs /app
WORKDIR /app/apps/worker
USER nodejs
EXPOSE 9091 9092
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun run -e "fetch('http://localhost:9092/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["bun", "run", "dist/index.js"]
