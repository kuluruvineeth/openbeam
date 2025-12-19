<div align="center">

[![GitHub Banner](apps/web/public/assets/github-banner.png)](https://github.com/kuluruvineeth/openplane)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-000000?style=flat&logo=hono&logoColor=white)](https://hono.dev/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh/)

</div>

## Overview

OpenPlane is a production platform for workplace search, reinforcement learning agents, and video editing. Built for reliability and scale.

## Tech Stack

| Category     | Technology         |
| ------------ | ------------------ |
| **Language** | TypeScript         |
| **Frontend** | Next.js, React     |
| **Backend**  | Hono, tRPC         |
| **Runtime**  | Bun                |
| **Database** | PostgreSQL, Prisma |
| **Auth**     | Better-Auth        |
| **Monorepo** | Turborepo          |

## Quick Start

```bash
# Install dependencies
bun install

# Set up database
bun run db:push

# Start development servers
bun run dev
```

**Access:**

- Web App: <http://localhost:3001>
- API Server: <http://localhost:3000>
- Documentation: <http://localhost:4000>

## Project Structure

```
openplane/
├── apps/
│   ├── web/         # Next.js frontend
│   ├── server/      # Hono API server
│   └── docs/        # Documentation site
└── packages/
    ├── api/         # Shared API logic
    ├── auth/        # Authentication
    └── db/          # Database schema
```

## Development

### Available Scripts

| Command               | Description                       |
| --------------------- | --------------------------------- |
| `bun run dev`         | Start all services in development |
| `bun run build`       | Build all packages                |
| `bun run check-types` | Run TypeScript type checking      |
| `bun run db:push`     | Push Prisma schema to database    |
| `bun run db:studio`   | Open Prisma Studio                |

### Docker

**Using Docker Compose:**

```bash
docker-compose up -d
```

**Pre-built Images:**

```bash
docker pull ghcr.io/kuluruvineeth/openplane-server:latest
docker pull ghcr.io/kuluruvineeth/openplane-web:latest
docker pull ghcr.io/kuluruvineeth/openplane-docs:latest
```

## CI/CD Pipeline

Our automated pipeline ensures quality and efficiency:

1. **CI** - Linting, type checking, and builds on every push
2. **Docker** - Builds and pushes images to GHCR after CI succeeds
3. **Security** - Trivy vulnerability scanning and SBOM generation
4. **Deploy** - Images are ready for deployment to any platform

The pipeline intelligently builds only services with changes (server, web, docs, worker), optimizing build times. Multi-platform builds (linux/amd64, linux/arm64) ensure broad compatibility.

## Deployment

OpenPlane can be deployed using:

- **Docker Compose** (local/single-node): `docker-compose up -d`
- **Kubernetes** (production): Helm charts in `infra/k8s/`
- **GCP** (cloud): Terraform modules in `infra/terraform/`
- **Self-Hosted**: See comprehensive guides in `docs/self-hosting/`

All images are published to GitHub Container Registry and include security scanning results.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

<div align="center">

Built with ❤️ by the OpenPlane team

</div>
