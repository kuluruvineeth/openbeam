# Contributing to OpenPlane

Thank you for contributing to OpenPlane!

## Prerequisites

- [Bun](https://bun.sh) 1.3.2+
- [Docker](https://www.docker.com/) (optional)
- [Git](https://git-scm.com/)

## Development Setup

### Option 1: Docker Compose (Recommended)

```bash
git clone https://github.com/kuluruvineeth/openplane.git
cd openplane
cp .env.example .env
docker-compose up -d
```

### Option 2: Local Development

```bash
bun install
docker-compose up -d postgres
bun run db:push
bun run dev
```

## Development Workflow

1. Create a branch: `git checkout -b feature/your-feature`

2. Make changes

3. Run checks:

   ```bash
   bun run check-types
   bun x ultracite fix
   bun run build
   ```

4. Commit: `git commit -m "feat: your message"`
5. Push and create a Pull Request

## Code Style

- [Ultracite](https://github.com/ultracite/ultracite) for formatting
- TypeScript strict mode
- Follow existing patterns

## CI/CD

All PRs automatically run:

- Linting and formatting checks
- Type checking
- Build verification

Only changed services are built and deployed, reducing CI time.

## Pull Requests

- Keep changes focused
- Ensure CI checks pass
- Update documentation as needed
- Request review from maintainers

Thank you for contributing! 🎉
