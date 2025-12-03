
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
    bucket = "openplane-prod-terraform-state"
    prefix = "terraform/state/prod"
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
  environment  = "prod"
  project_name = "openplane"
  
  server_sa = google_service_account.server.email
  worker_sa = google_service_account.worker.email
  web_sa    = google_service_account.web.email
  docs_sa   = google_service_account.docs.email
  vespa_sa  = google_service_account.vespa.email

  server_image = "ghcr.io/${var.github_org}/openplane-server:${var.image_tag}"
  worker_image = "ghcr.io/${var.github_org}/openplane-worker:${var.image_tag}"
  web_image    = "ghcr.io/${var.github_org}/openplane-web:${var.image_tag}"
  docs_image   = "ghcr.io/${var.github_org}/openplane-fumadocs:${var.image_tag}"
}

module "networking" {
  source = "../../modules/networking"

  project_name            = local.project_name
  environment             = local.environment
  region                  = var.region
  cloud_run_subnet_cidr   = var.cloud_run_subnet_cidr
  compute_subnet_cidr     = var.compute_subnet_cidr
  pods_subnet_cidr        = var.pods_subnet_cidr
  services_subnet_cidr    = var.services_subnet_cidr
  enable_metrics_scraping = true
}

resource "google_service_account" "server" {
  account_id   = "${local.project_name}-server-${local.environment}"
  display_name = "OpenPlane Server (${local.environment})"
  description  = "Service account for OpenPlane API server"
  project      = var.project_id
}

resource "google_service_account" "worker" {
  account_id   = "${local.project_name}-worker-${local.environment}"
  display_name = "OpenPlane Worker (${local.environment})"
  description  = "Service account for OpenPlane background worker"
  project      = var.project_id
}

resource "google_service_account" "web" {
  account_id   = "${local.project_name}-web-${local.environment}"
  display_name = "OpenPlane Web (${local.environment})"
  description  = "Service account for OpenPlane web frontend"
  project      = var.project_id
}

resource "google_service_account" "docs" {
  account_id   = "${local.project_name}-docs-${local.environment}"
  display_name = "OpenPlane Docs (${local.environment})"
  description  = "Service account for OpenPlane documentation site"
  project      = var.project_id
}

resource "google_service_account" "vespa" {
  account_id   = "${local.project_name}-vespa-${local.environment}"
  display_name = "OpenPlane Vespa (${local.environment})"
  description  = "Service account for Vespa search engine VM"
  project      = var.project_id
}

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

resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "${local.project_name}-openai-api-key-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "ai"
  }
}

resource "google_secret_manager_secret_version" "openai_api_key" {
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key
}

resource "google_secret_manager_secret_iam_member" "worker_openai_secret" {
  secret_id = google_secret_manager_secret.openai_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.worker_sa}"
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "server_openai_secret" {
  secret_id = google_secret_manager_secret.openai_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.server_sa}"
  project   = var.project_id
}

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id                = var.project_id
  project_name              = local.project_name
  environment               = local.environment
  region                    = var.region
  network_id                = module.networking.network_id
  private_vpc_connection_id = module.networking.private_vpc_connection_id

  tier                  = var.cloud_sql_tier
  high_availability     = var.cloud_sql_high_availability
  disk_size             = var.cloud_sql_disk_size
  disk_autoresize_limit = var.cloud_sql_disk_autoresize_limit

  database_name = var.database_name
  database_user = var.database_user

  backup_start_time      = "03:00"
  point_in_time_recovery = true
  backup_retention_count = 7
}

module "redis" {
  source = "../../modules/redis"

  project_id   = var.project_id
  project_name = local.project_name
  environment  = local.environment
  region       = var.region
  network_id   = module.networking.network_id

  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size_gb
  replica_count  = var.redis_replica_count
  auth_enabled   = true

  persistence_mode    = "RDB"
  rdb_snapshot_period = "TWELVE_HOURS"
}

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

  machine_type = var.vespa_machine_type
  preemptible  = false

  boot_disk_size = 50
  data_disk_size = var.vespa_data_disk_size
  data_disk_type = "pd-ssd"

  vespa_version = var.vespa_version

  allowed_source_ranges = [var.cloud_run_subnet_cidr]

  enable_snapshot_schedule = true
  snapshot_start_time      = "02:00"
  snapshot_retention_days  = 7

  service_account_email = local.vespa_sa
}

module "server" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "server"
  environment  = local.environment
  region       = var.region
  image        = local.server_image

  min_instances = var.server_min_instances
  max_instances = var.server_max_instances

  cpu    = "2"
  memory = "2Gi"
  timeout = "300s"

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id
  vpc_egress_mode    = "PRIVATE_RANGES_ONLY"

  env_vars = {
    NODE_ENV            = "production"
    PORT                = "3000"
    VESPA_URL           = module.vespa.vespa_query_url
    OPENAI_BASE_URL     = var.openai_base_url
    OPENAI_ORGANIZATION = var.openai_organization
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
    OPENAI_API_KEY = {
      secret_id = google_secret_manager_secret.openai_api_key.secret_id
      version   = "latest"
    }
  }

  allow_public_access    = true
  service_account_email  = local.server_sa

  depends_on = [
    google_secret_manager_secret_iam_member.server_secrets,
    google_secret_manager_secret_iam_member.server_openai_secret
  ]

  startup_probe_enabled  = true
  startup_probe_path     = "/"
  liveness_probe_enabled = true
  liveness_probe_path    = "/"
}

module "worker" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "worker"
  environment  = local.environment
  region       = var.region
  image        = local.worker_image

  min_instances = var.worker_min_instances
  max_instances = var.worker_max_instances

  cpu        = "4"
  memory     = "4Gi"
  cpu_idle   = false
  timeout    = "3600s"

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id
  vpc_egress_mode    = "PRIVATE_RANGES_ONLY"

  env_vars = {
    NODE_ENV            = "production"
    VESPA_URL           = module.vespa.vespa_feed_url
    OPENAI_BASE_URL     = var.openai_base_url
    OPENAI_ORGANIZATION = var.openai_organization
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
    OPENAI_API_KEY = {
      secret_id = google_secret_manager_secret.openai_api_key.secret_id
      version   = "latest"
    }
  }

  allow_public_access   = false
  service_account_email = local.worker_sa

  depends_on = [
    google_secret_manager_secret_iam_member.worker_secrets,
    google_secret_manager_secret_iam_member.worker_openai_secret
  ]

  liveness_probe_enabled = true
  liveness_probe_path    = "/metrics"
  container_port         = 9091
}

module "web" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "web"
  environment  = local.environment
  region       = var.region
  image        = local.web_image

  min_instances = var.web_min_instances
  max_instances = var.web_max_instances

  cpu    = "1"
  memory = "1Gi"

  env_vars = {
    NEXT_PUBLIC_API_URL = module.server.service_url
  }

  allow_public_access   = true
  service_account_email = local.web_sa
}

module "docs" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "docs"
  environment  = local.environment
  region       = var.region
  image        = local.docs_image

  min_instances = 0
  max_instances = 3

  cpu    = "1"
  memory = "512Mi"

  allow_public_access   = true
  service_account_email = local.docs_sa
}

