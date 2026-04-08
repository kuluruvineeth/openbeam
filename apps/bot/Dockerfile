FROM openbeamdevacr.azurecr.io/oven/bun:1.3.3 AS pruner
WORKDIR /app
RUN bun add -g turbo@2.5.4
COPY . .
RUN turbo prune bot --docker

FROM openbeamdevacr.azurecr.io/openbeam-base:latest AS deps
WORKDIR /app
COPY --from=pruner /app/out/full/ .
RUN bun install --no-progress --linker hoisted

FROM deps AS prisma
WORKDIR /app
RUN cd packages/db && bun run db:generate

FROM prisma AS builder
WORKDIR /app
RUN bun run --filter=bot build

FROM openbeamdevacr.azurecr.io/oven/bun:1.3.3 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
COPY --from=builder /app/package.json /app/turbo.json ./
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/bot ./apps/bot
RUN mkdir -p apps/bot/node_modules/@openbeam && \
    for pkg in packages/*/; do \
      name=$(basename "$pkg"); \
      rm -rf "apps/bot/node_modules/@openbeam/$name" && \
      ln -s "../../../../packages/$name" "apps/bot/node_modules/@openbeam/$name"; \
    done
RUN chown -R nodejs:nodejs /app
WORKDIR /app/apps/bot
USER nodejs
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3005/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["bun", "run", "dist/index.js"]
