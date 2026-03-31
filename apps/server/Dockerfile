FROM openbeamdevacr.azurecr.io/oven/bun:1.3.3 AS pruner
WORKDIR /app
RUN bun add -g turbo@2.5.4
COPY . .
RUN turbo prune server --docker

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
ARG CACHE_BUST=1
RUN bun run --filter=@openbeam/mcp-apps build && bun run --filter=server build

FROM openbeamdevacr.azurecr.io/oven/bun:1.3.3 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
COPY --from=builder /app/package.json /app/turbo.json ./
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server ./apps/server
COPY scripts/migrate.sh ./scripts/migrate.sh
RUN mkdir -p apps/server/node_modules/@openbeam && \
    for pkg in packages/*/; do \
      name=$(basename "$pkg"); \
      rm -rf "apps/server/node_modules/@openbeam/$name" && \
      ln -s "../../../../packages/$name" "apps/server/node_modules/@openbeam/$name"; \
    done
RUN chmod +x ./scripts/migrate.sh && chown -R nodejs:nodejs /app
WORKDIR /app/apps/server
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["bun", "run", "dist/index.js"]
