FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN cd packages/db && bun install --frozen-lockfile
RUN cd packages/redis && bun install --frozen-lockfile
RUN cd packages/vespa && bun install --frozen-lockfile
RUN cd apps/worker && bun install --frozen-lockfile

# Generate Prisma Client
FROM deps AS prisma
WORKDIR /app/packages/db
RUN bun run db:generate

# Build worker
FROM base AS builder
COPY --from=prisma /app .
WORKDIR /app/apps/worker
RUN bun run build

# Production image
FROM base AS runner
ENV NODE_ENV=production

# Copy built files and dependencies
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

WORKDIR /app

# Run the worker
CMD ["bun", "run", "dist/index.js"]

