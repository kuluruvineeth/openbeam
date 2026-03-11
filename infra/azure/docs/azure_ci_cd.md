# Azure CI/CD Pipeline

Production-grade CI/CD for OpenBeam on Azure AKS. Zero-touch deployments on merge to `dev`.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                                │
│                                                                      │
│  Push to dev ──► CI Gate ──► Detect Changes ──► Build Images ──► Deploy
│                    │              │                   │             │
│              lint + test    path-based          ACR cloud       Helm upgrade
│              typecheck      filtering           builds          + rollout
│              security       matrix gen          parallel        + health
│                                                                      │
│  On failure: ◄──────────── Auto-Rollback (Helm rollback) ◄──────────┘
│                                                                      │
│  Manual: Emergency Rollback workflow (any revision)                   │
└──────────────────────────────────────────────────────────────────────┘
```

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push + PR to dev/main | Lint, typecheck, test, security scan |
| `azure-build-deploy.yml` | Push to dev | Build images → Deploy to AKS |
| `azure-rollback.yml` | Manual | Emergency rollback (Helm or per-service) |
| `azure-infra.yml` | Infra changes or manual | Terraform plan/apply |
| `deploy-coolify.yml` | Push to dev | Website + Docs to Hetzner/Coolify |

## Pipeline Flow

### On push to `dev`:

```
1. CI Gate (parallel jobs)
   ├── Lint & Type Check      (bun x ultracite check + turbo check-types)
   ├── Build All Packages     (turbo build)
   ├── Test TypeScript         (bun test --coverage)
   ├── Test Temporal           (vitest + Node.js)
   ├── Test Python             (pytest, 70% coverage)
   ├── Test Go                 (go test ./...)
   └── Security Scan           (Gitleaks)

2. Detect Changes (path-based filtering)
   ├── Which services changed? (server, web, worker, engine)
   ├── Database migration?     (packages/db/prisma/)
   ├── Vespa schema?           (packages/vespa/application/)
   └── Base image?             (Dockerfile.base)

3. Build Images (parallel, ACR cloud builds)
   ├── Base image              (if Dockerfile.base changed)
   ├── openbeam-server:dev-{sha}
   ├── openbeam-web:dev-{sha}  (with build-time NEXT_PUBLIC_* vars)
   ├── openbeam-worker:dev-{sha}
   └── openbeam-engine:dev-{sha}

4. Deploy to AKS
   ├── Helm upgrade            (with new image tags)
   ├── Rollout restart         (only changed services)
   ├── Database migration      (if schema changed)
   ├── Vespa schema deploy     (if search schema changed)
   └── Health check            (api.openbeam.work)

5. On failure → Auto-rollback  (helm rollback)
```

## Smart Change Detection

Only changed services get rebuilt and deployed:

| Changed Path | Rebuilds |
|-------------|----------|
| `packages/types/**` | ALL services (foundation package) |
| `Dockerfile.base` | ALL services (shared base layer) |
| `packages/db/**` | server, web, worker |
| `packages/auth/**` | server, web |
| `packages/api/**` | server, web, worker |
| `packages/temporal/**` | server, worker |
| `packages/services/**` | server, worker |
| `packages/ai/**` | server, worker |
| `packages/ui/**` | web |
| `packages/vespa/**` | worker |
| `apps/server/**` | server only |
| `apps/web/**` | web only |
| `apps/worker/**` | worker only |
| `apps/engine/**` | engine only |

## Image Tagging

```
openbeam-{service}:dev-{short-sha}    # Immutable, traceable
openbeam-{service}:latest             # Mutable, for local dev
```

Examples:
- `openbeamdevacr.azurecr.io/openbeam-server:dev-a1b2c3d`
- `openbeamdevacr.azurecr.io/openbeam-web:dev-a1b2c3d`

## GitHub Secrets Required

### Azure OIDC Authentication (recommended)

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Service principal / managed identity client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

Setup federated credentials:
```bash
az ad app federated-credential create \
  --id <APP_OBJECT_ID> \
  --parameters '{
    "name": "github-dev",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:kuluruvineeth/openplane:ref:refs/heads/dev",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### Build Secrets

| Secret | Description |
|--------|-------------|
| `HUGEICONS_PRO_AUTH_TOKEN` | HugeIcons Pro npm registry token |
| `GITLEAKS_LICENSE` | Gitleaks secret scanning license |

### GitHub Variables (non-secret)

| Variable | Default | Description |
|----------|---------|-------------|
| `AZURE_WEB_URL` | `https://app.openbeam.work` | Public web URL (build-time) |
| `AZURE_API_URL` | `https://api.openbeam.work` | Public API URL (build-time) |
| `NEXT_PUBLIC_POSTHOG_KEY` | `placeholder` | PostHog analytics key |

## GitHub Environment: `azure-dev`

Create environment in repo Settings → Environments:

- **Name**: `azure-dev`
- **Protection rules**: None (auto-deploy on dev)
- **Deployment branches**: `dev` only
- **URL**: `https://app.openbeam.work`

For production, create `azure-prod` with:
- Required reviewers (manual approval)
- Deployment branches: `main` only

## Emergency Rollback

### Via GitHub Actions UI

1. Go to Actions → "Azure: Emergency Rollback"
2. Click "Run workflow"
3. Options:
   - **Revision**: Leave empty for previous, or specify Helm revision number
   - **Service**: Leave empty for all, or pick one service

### Via CLI

```bash
# Rollback entire release
helm rollback openbeam -n openbeam

# Rollback to specific revision
helm rollback openbeam 10 -n openbeam

# Rollback single service
kubectl rollout undo deployment/openbeam-server -n openbeam

# View history
helm history openbeam -n openbeam
```

## Manual Deployment

### Build only (no deploy)

Actions → "Azure: Build & Deploy" → Run workflow:
- services: `server,web` (or `all`)
- skip_deploy: `true`

### Full redeploy

Actions → "Azure: Build & Deploy" → Run workflow:
- services: `all`
- force_base: `true` (if base image needs rebuild)

### Infrastructure changes

Actions → "Azure: Infrastructure" → Run workflow:
- action: `plan` (preview) or `apply` (execute)
- environment: `dev`

## Deployment Targets

| Domain | Service | Infrastructure |
|--------|---------|---------------|
| `app.openbeam.work` | Web (Next.js) | Azure AKS |
| `api.openbeam.work` | Server (Hono) | Azure AKS |
| `temporal.openbeam.work` | Temporal UI | Azure AKS |
| `openbeam.work` | Website (Next.js) | Hetzner / Coolify |
| `docs.openbeam.work` | Docs (Next.js) | Hetzner / Coolify |

### Hetzner/Coolify Pipeline

Website and docs auto-deploy via `deploy-coolify.yml`:
- Builds to GHCR (`ghcr.io/kuluruvineeth/openbeam-website`, `...-docs`)
- SSH pulls latest images on Hetzner
- Coolify webhook triggers redeploy
- Separate from AKS pipeline — lightweight static sites

## Cluster Info

| Resource | Value |
|----------|-------|
| Region | westus2 |
| Resource Group | rg-openbeam-dev |
| AKS Cluster | openbeam-dev-aks |
| ACR | openbeamdevacr.azurecr.io |
| External IP | 20.69.83.61 |
| Nodes | 4 (3 system + 1 spot) |

## Monitoring Deployment Health

```bash
# Pod status
kubectl get pods -n openbeam

# Recent deployments
helm history openbeam -n openbeam --max 10

# Logs
kubectl logs deployment/openbeam-server -n openbeam --tail=50
kubectl logs deployment/openbeam-web -n openbeam --tail=50
kubectl logs deployment/openbeam-worker -n openbeam --tail=50

# Health endpoints
curl https://api.openbeam.work/api/health/system
curl -o /dev/null -w "%{http_code}" https://app.openbeam.work
curl -o /dev/null -w "%{http_code}" https://temporal.openbeam.work
```

## Cost

~$150-200/mo (4 D2as_v5 nodes, 1 spot, Basic ACR, managed disks)

ACR cloud builds: ~$0.0001/sec (negligible for 4 builds × 7min = $0.17/deploy)
