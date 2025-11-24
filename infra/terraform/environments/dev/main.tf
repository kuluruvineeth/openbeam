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
    # bucket = "openplane-dev-terraform-state"
    # prefix = "terraform/state/dev"
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

  server_image = "ghcr.io/${var.github_org}/openplane-server:${var.image_tag}"
  worker_image = "ghcr.io/${var.github_org}/openplane-worker:${var.image_tag}"
  web_image    = "ghcr.io/${var.github_org}/openplane-web:${var.image_tag}"
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
    NODE_ENV  = "development"
    PORT      = "3000"
    VESPA_URL = module.vespa.vespa_query_url
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

  allow_public_access   = true
  service_account_email = local.server_sa
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

  cpu        = "2"
  memory     = "2Gi"
  cpu_idle   = false
  timeout    = "3600s"

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id

  env_vars = {
    NODE_ENV  = "development"
    VESPA_URL = module.vespa.vespa_feed_url
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
  }

  allow_public_access   = true
  service_account_email = local.web_sa
}

