# ==============================================================================
# OpenPlane Development Environment
# ==============================================================================
# Cost-optimized configuration for development and testing
# Uses smaller instances, preemptible VMs, and scales to zero when idle
# ==============================================================================

terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "gcs" {
    bucket = "openplane-dev-terraform-state"
    prefix = "terraform/state/dev"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = {
    environment = local.environment
    project     = local.project_name
    managed_by  = "terraform"
  }
}

locals {
  environment  = "dev"
  project_name = "openplane"
  
  server_sa = google_service_account.server.email
  worker_sa = google_service_account.worker.email
  web_sa    = google_service_account.web.email
  vespa_sa  = google_service_account.vespa.email

  # Real images from Artifact Registry (Uncomment after CI/CD build)
  server_image = "${module.artifact_registry.repository_url}/openplane-server:${var.redeploy_id}"
  worker_image = "${module.artifact_registry.repository_url}/openplane-worker:${var.redeploy_id}"
  web_image    = "${module.artifact_registry.repository_url}/openplane-web:${var.redeploy_id}"

  # Placeholder images for initial infrastructure creation
  # server_image = "us-docker.pkg.dev/cloudrun/container/hello"
  # worker_image = "us-docker.pkg.dev/cloudrun/container/hello"
  # web_image    = "us-docker.pkg.dev/cloudrun/container/hello"
}

# ==============================================================================
# Networking Module
# ==============================================================================

module "networking" {
  source = "../../modules/networking"

  project_name            = local.project_name
  environment             = local.environment
  region                  = var.region
  cloud_run_subnet_cidr   = "10.0.0.0/24"
  compute_subnet_cidr     = "10.0.1.0/24"
  pods_subnet_cidr        = "10.1.0.0/16"
  services_subnet_cidr    = "10.2.0.0/16"
  enable_metrics_scraping = true

}

# ==============================================================================
# Artifact Registry
# ==============================================================================

module "artifact_registry" {
  source = "../../modules/artifact-registry"

  project_id    = var.project_id
  location      = var.region
  repository_id = "${local.project_name}-repo"
  format        = "DOCKER"
  description   = "Docker repository for OpenPlane images"
  
  labels = {
    environment = local.environment
  }
}

# ==============================================================================
# IAM - Service Accounts
# ==============================================================================

resource "google_service_account" "server" {
  account_id   = "${local.project_name}-server-${local.environment}"
  display_name = "OpenPlane Server (${local.environment})"
  project      = var.project_id
}

resource "google_service_account" "worker" {
  account_id   = "${local.project_name}-worker-${local.environment}"
  display_name = "OpenPlane Worker (${local.environment})"
  project      = var.project_id
}

resource "google_service_account" "web" {
  account_id   = "${local.project_name}-web-${local.environment}"
  display_name = "OpenPlane Web (${local.environment})"
  project      = var.project_id
}

resource "google_service_account" "vespa" {
  account_id   = "${local.project_name}-vespa-${local.environment}"
  display_name = "OpenPlane Vespa (${local.environment})"
  project      = var.project_id
}

# ==============================================================================
# Secret Manager - Auth & OAuth Secrets
# ==============================================================================

resource "google_secret_manager_secret" "better_auth_secret" {
  secret_id = "${local.project_name}-better-auth-secret-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "auth"
  }
}

resource "google_secret_manager_secret_version" "better_auth_secret" {
  secret      = google_secret_manager_secret.better_auth_secret.id
  secret_data = var.better_auth_secret
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${local.project_name}-jwt-secret-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "auth"
  }
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "${local.project_name}-google-client-id-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "oauth"
  }
}

resource "google_secret_manager_secret_version" "google_client_id" {
  secret      = google_secret_manager_secret.google_client_id.id
  secret_data = var.google_client_id
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "${local.project_name}-google-client-secret-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "oauth"
  }
}

resource "google_secret_manager_secret_version" "google_client_secret" {
  secret      = google_secret_manager_secret.google_client_secret.id
  secret_data = var.google_client_secret
}



# Secret Manager Access
resource "google_secret_manager_secret_iam_member" "server_secrets" {
  for_each  = toset(["db-password", "db-connection-string", "redis-url"])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.server_sa}"
  project   = var.project_id

  depends_on = [
    module.cloud_sql,
    module.redis
  ]
}

resource "google_secret_manager_secret_iam_member" "server_auth_secrets" {
  for_each  = toset(["better-auth-secret", "jwt-secret", "google-client-id", "google-client-secret"])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.server_sa}"
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "worker_secrets" {
  for_each  = toset(["db-password", "db-connection-string", "redis-url"])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.worker_sa}"
  project   = var.project_id

  depends_on = [
    module.cloud_sql,
    module.redis
  ]
}

resource "google_secret_manager_secret_iam_member" "worker_auth_secrets" {
  for_each  = toset([])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.worker_sa}"
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "web_secrets" {
  for_each  = toset(["better-auth-secret", "google-client-id", "google-client-secret", "db-connection-string"])
  secret_id = replace(each.key, "-", "_") == "db_connection_string" ? module.cloud_sql.connection_string_secret_id : "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.web_sa}"
  project   = var.project_id
}


# ==============================================================================
# Cloud SQL Module (Cost-Optimized)
# ==============================================================================

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id                = var.project_id
  project_name              = local.project_name
  environment               = local.environment
  region                    = var.region
  network_id                = module.networking.network_id
  private_vpc_connection_id = module.networking.private_vpc_connection_id

  # Minimal configuration for dev
  tier                  = "db-f1-micro"     # Shared core, 0.6GB RAM (~$10/month)
  high_availability     = false             # No HA for dev
  disk_size             = 10                # Smaller disk for dev
  disk_autoresize_limit = 50

  database_name = "openplane"
  database_user = "openplane"

  # Reduced backup retention
  backup_retention_count = 3
  point_in_time_recovery = false

  # Enable public IP for dev environment (easier local development)
  enable_public_ip = true
  authorized_networks = [
    {
      name  = "allow-all"
      value = "0.0.0.0/0"
    }
  ]
}

# ==============================================================================
# Redis Module (Cost-Optimized)
# ==============================================================================

module "redis" {
  source = "../../modules/redis"

  project_id   = var.project_id
  project_name = local.project_name
  environment  = local.environment
  region       = var.region
  network_id   = module.networking.network_id
  private_vpc_connection_id = module.networking.private_vpc_connection_id

  # Minimal configuration for dev
  tier           = "BASIC"      # No HA (~$25/month)
  memory_size_gb = 1            # Minimal memory
  replica_count  = 0            # No replicas
  auth_enabled   = false        # Simplify local dev

  persistence_mode = "DISABLED" # No persistence for dev
}

# ==============================================================================
# Compute Engine Module (Preemptible)
# ==============================================================================

module "vespa" {
  source = "../../modules/compute-engine"

  project_id    = var.project_id
  project_name  = local.project_name
  environment   = local.environment
  region        = var.region
  zone          = var.zone
  network_id    = module.networking.network_id
  network_name  = module.networking.network_name
  subnetwork_id = module.networking.compute_subnet_id

  # Smaller instance + preemptible (80% cheaper!)
  machine_type = "n2-standard-2" # 2 vCPU, 8GB RAM
  preemptible  = true            # Can be stopped by Google

  boot_disk_size = 30
  data_disk_size = 50
  data_disk_type = "pd-balanced" # Cheaper than SSD

  vespa_version = "8.269.17"

  allowed_source_ranges = ["10.0.0.0/24"]

  # Disable snapshots for dev
  enable_snapshot_schedule = false

  service_account_email = local.vespa_sa
}

# ==============================================================================
# Cloud Run Job - Database Migrations
# ==============================================================================

module "db_migrate_job" {
  source = "../../modules/cloud-run-job"

  project_id   = var.project_id
  project_name = local.project_name
  job_name     = "db-migrate"
  environment  = local.environment
  region       = var.region
  image        = local.server_image

  command = ["sh", "-c"]
  args    = ["/app/scripts/migrate.sh"]

  cpu    = "1"
  memory = "512Mi"
  timeout = "600s"

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id

  env_vars = {
    NODE_ENV = "development"
  }

  secret_env_vars = {
    DATABASE_URL = {
      secret_id = module.cloud_sql.connection_string_secret_id
      version   = "latest"
    }
  }

  service_account_email = local.server_sa

  depends_on = [
    google_secret_manager_secret_iam_member.server_secrets
  ]
}

# ==============================================================================
# Cloud Run - Server
# ==============================================================================

module "server" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "server"
  environment  = local.environment
  region       = var.region
  image        = local.server_image

  # Scale to zero when idle
  min_instances = 0
  max_instances = 2

  # Smaller resources
  cpu    = "1"
  memory = "1Gi"

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id

  env_vars = {
    NODE_ENV        = "development"
    VESPA_URL       = module.vespa.vespa_query_url
    # Placeholders to break circular dependency (Server -> Web, Server -> Server)
    # Will update these with real URLs after first apply
    BETTER_AUTH_URL = "https://openplane-server-dev-7ol6rrbvca-uc.a.run.app" 
    CORS_ORIGIN     = "https://openplane-web-dev-7ol6rrbvca-uc.a.run.app"
  }

  secret_env_vars = {
    DATABASE_URL = {
      secret_id = module.cloud_sql.connection_string_secret_id
      version   = "latest"
    }
    REDIS_URL = {
      secret_id = module.redis.redis_url_secret_id
      version   = "latest"
    }
    BETTER_AUTH_SECRET = {
      secret_id = google_secret_manager_secret.better_auth_secret.secret_id
      version   = "latest"
    }
    JWT_SECRET = {
      secret_id = google_secret_manager_secret.jwt_secret.secret_id
      version   = "latest"
    }
    GOOGLE_CLIENT_ID = {
      secret_id = google_secret_manager_secret.google_client_id.secret_id
      version   = "latest"
    }
    GOOGLE_CLIENT_SECRET = {
      secret_id = google_secret_manager_secret.google_client_secret.secret_id
      version   = "latest"
    }
  }

  allow_public_access   = true
  service_account_email = local.server_sa

  depends_on = [
    google_secret_manager_secret_iam_member.server_secrets
  ]

  deletion_protection = false

  
}

# ==============================================================================
# Cloud Run - Worker
# ==============================================================================

module "worker" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "worker"
  environment  = local.environment
  region       = var.region
  image        = local.worker_image

  # Scale to zero when idle (testing only)
  min_instances = 0
  max_instances = 1

  cpu            = "2"
  memory         = "2Gi"
  cpu_idle       = false
  timeout        = "3600s"
  container_port = 9091

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id

  # Enable startup probe for worker health check
  startup_probe_enabled = true
  startup_probe_path     = "/metrics"

  env_vars = {
    NODE_ENV        = "development"
    VESPA_URL       = module.vespa.vespa_feed_url
    # Placeholders to break circular dependency
    BETTER_AUTH_URL = "https://openplane-server-dev-7ol6rrbvca-uc.a.run.app"
    CORS_ORIGIN     = "https://openplane-web-dev-7ol6rrbvca-uc.a.run.app"
  }

  secret_env_vars = {
    DATABASE_URL = {
      secret_id = module.cloud_sql.connection_string_secret_id
      version   = "latest"
    }
    REDIS_URL = {
      secret_id = module.redis.redis_url_secret_id
      version   = "latest"
    }
  }

  allow_public_access   = false
  service_account_email = local.worker_sa

  depends_on = [
    google_secret_manager_secret_iam_member.worker_secrets
  ]

  deletion_protection = false
}

# ==============================================================================
# Cloud Run - Web
# ==============================================================================

module "web" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "web"
  environment  = local.environment
  region       = var.region
  image        = local.web_image

  # Scale to zero when idle
  min_instances = 0
  max_instances = 2

  cpu    = "1"
  memory = "512Mi"

  env_vars = {
    NEXT_PUBLIC_API_URL = module.server.service_url
    # Placeholders to break circular dependency
    BETTER_AUTH_URL     = "https://openplane-server-dev-7ol6rrbvca-uc.a.run.app"
    CORS_ORIGIN         = "https://openplane-web-dev-7ol6rrbvca-uc.a.run.app"
  }

  secret_env_vars = {
    BETTER_AUTH_SECRET = {
      secret_id = google_secret_manager_secret.better_auth_secret.secret_id
      version   = "latest"
    }
    GOOGLE_CLIENT_ID = {
      secret_id = google_secret_manager_secret.google_client_id.secret_id
      version   = "latest"
    }
    GOOGLE_CLIENT_SECRET = {
      secret_id = google_secret_manager_secret.google_client_secret.secret_id
      version   = "latest"
    }
    DATABASE_URL = {
      secret_id = module.cloud_sql.connection_string_secret_id
      version   = "latest"
    }
  }

  allow_public_access   = true
  service_account_email = local.web_sa

  deletion_protection = false
}

