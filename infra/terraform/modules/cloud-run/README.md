# Cloud Run Module

Serverless containers with Direct VPC Egress and autoscaling.

## Usage

**Server (API):**

```hcl
module "server" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = "openbeam"
  service_name = "server"
  environment  = "prod"
  region       = "us-central1"
  image        = "ghcr.io/kuluruvineeth/openbeam-server:latest"

  min_instances = 1
  max_instances = 10
  cpu           = "2"
  memory        = "2Gi"

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id
  vpc_egress_mode    = "PRIVATE_RANGES_ONLY"

  env_vars = {
    NODE_ENV = "production"
    PORT     = "3000"
  }

  secret_env_vars = {
    DATABASE_URL = {
      secret_id = module.cloud_sql.connection_string_secret_id
      version   = "latest"
    }
  }

  allow_public_access   = true
  service_account_email = google_service_account.server.email
}
```

**Worker (Background Jobs):**

```hcl
module "worker" {
  source = "../../modules/cloud-run"

  # ... same as above ...

  min_instances = 1
  max_instances = 5
  cpu           = "4"
  memory        = "4Gi"
  cpu_idle      = false   # Always allocate CPU
  timeout       = "3600s" # 1 hour for long jobs

  allow_public_access = false  # Private service
}
```

## Environment Configs

**Dev:**

```hcl
min_instances = 0  # Scale to zero (~$5/mo)
max_instances = 1
cpu           = "1"
memory        = "512Mi"
```

**Prod:**

```hcl
min_instances = 1  # Always-on (~$50/mo)
max_instances = 10
cpu           = "2"
memory        = "2Gi"
```
