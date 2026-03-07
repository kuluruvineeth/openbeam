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
    bucket = "openbeam-dev-terraform-state"
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
  project_name = "openbeam"
  
  server_sa = google_service_account.server.email
  worker_sa = google_service_account.worker.email
  web_sa    = google_service_account.web.email
  vespa_sa  = google_service_account.vespa.email
  engine_sa = google_service_account.engine.email

  server_image = "${module.artifact_registry.repository_url}/openbeam-server:${var.redeploy_id}"
  worker_image = "${module.artifact_registry.repository_url}/openbeam-worker:${var.redeploy_id}"
  web_image    = "${module.artifact_registry.repository_url}/openbeam-web:${var.redeploy_id}"
  engine_image = "${module.artifact_registry.repository_url}/openbeam-engine:${var.redeploy_id}"

  server_url = var.server_domain != "" ? "https://${var.server_domain}" : ""
  web_url    = var.web_domain != "" ? "https://${var.web_domain}" : ""

  # Placeholder images for initial infrastructure creation
  # server_image = "us-docker.pkg.dev/cloudrun/container/hello"
  # worker_image = "us-docker.pkg.dev/cloudrun/container/hello"
  # web_image    = "us-docker.pkg.dev/cloudrun/container/hello"
}

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

module "artifact_registry" {
  source = "../../modules/artifact-registry"

  project_id    = var.project_id
  location      = var.region
  repository_id = "${local.project_name}-repo"
  format        = "DOCKER"
  description   = "Docker repository for OpenBeam images"
  
  labels = {
    environment = local.environment
  }
}

resource "google_service_account" "server" {
  account_id   = "${local.project_name}-server-${local.environment}"
  display_name = "OpenBeam Server (${local.environment})"
  project      = var.project_id
}

resource "google_service_account" "worker" {
  account_id   = "${local.project_name}-worker-${local.environment}"
  display_name = "OpenBeam Worker (${local.environment})"
  project      = var.project_id
}

resource "google_service_account" "web" {
  account_id   = "${local.project_name}-web-${local.environment}"
  display_name = "OpenBeam Web (${local.environment})"
  project      = var.project_id
}

resource "google_service_account" "vespa" {
  account_id   = "${local.project_name}-vespa-${local.environment}"
  display_name = "OpenBeam Vespa (${local.environment})"
  project      = var.project_id
}

resource "google_service_account" "engine" {
  account_id   = "${local.project_name}-engine-${local.environment}"
  display_name = "OpenBeam Engine (${local.environment})"
  project      = var.project_id
}

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

resource "google_secret_manager_secret" "encryption_key" {
  secret_id = "${local.project_name}-encryption-key-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "credentials"
  }
}

resource "google_secret_manager_secret_version" "encryption_key" {
  secret      = google_secret_manager_secret.encryption_key.id
  secret_data = var.encryption_key
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
  for_each  = toset(["better-auth-secret", "jwt-secret", "google-client-id", "google-client-secret", "encryption-key", "openai-api-key"])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.server_sa}"
  project   = var.project_id

  depends_on = [google_secret_manager_secret.openai_api_key]
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
  for_each  = toset(["encryption-key", "openai-api-key"])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.worker_sa}"
  project   = var.project_id

  depends_on = [google_secret_manager_secret.openai_api_key]
}

resource "google_secret_manager_secret_iam_member" "web_secrets" {
  for_each  = toset(["better-auth-secret", "google-client-id", "google-client-secret", "db-connection-string"])
  secret_id = replace(each.key, "-", "_") == "db_connection_string" ? module.cloud_sql.connection_string_secret_id : "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.web_sa}"
  project   = var.project_id
}

resource "google_secret_manager_secret_iam_member" "engine_redis_secret" {
  secret_id = "${local.project_name}-redis-url-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.engine_sa}"
  project   = var.project_id

  depends_on = [module.redis]
}

module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id                = var.project_id
  project_name              = local.project_name
  environment               = local.environment
  region                    = var.region
  network_id                = module.networking.network_id
  private_vpc_connection_id = module.networking.private_vpc_connection_id

  tier                  = "db-f1-micro"
  high_availability     = false
  disk_size             = 10
  disk_autoresize_limit = 50

  database_name = "openbeam"
  database_user = "openbeam"

  backup_retention_count = 3
  point_in_time_recovery = false

  enable_public_ip = true
  authorized_networks = [
    {
      name  = "allow-all"
      value = "0.0.0.0/0"
    }
  ]
}

module "redis" {
  source = "../../modules/redis"

  project_id   = var.project_id
  project_name = local.project_name
  environment  = local.environment
  region       = var.region
  network_id   = module.networking.network_id
  private_vpc_connection_id = module.networking.private_vpc_connection_id

  tier           = "BASIC"
  memory_size_gb = 1
  replica_count  = 0
  auth_enabled   = false

  persistence_mode = "DISABLED"
}

module "storage" {
  source = "../../modules/storage"

  project_id   = var.project_id
  project_name = local.project_name
  environment  = local.environment
  name         = "${local.project_name}-files-${local.environment}"
  location     = var.region

  versioning_enabled          = false
  uniform_bucket_level_access = true
  force_destroy               = true  # Dev only - allows bucket deletion with objects

  cors = [
    {
      origin          = ["*"]
      method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
      response_header = ["*"]
      max_age_seconds = 3600
    }
  ]

  lifecycle_rules = [
    {
      action = {
        type          = "Delete"
        storage_class = null
      }
      condition = {
        age                   = 90  # Delete files older than 90 days
        created_before        = null
        with_state            = null
        matches_storage_class = null
        num_newer_versions    = null
      }
    }
  ]
}

resource "google_secret_manager_secret" "gcs_access_key" {
  secret_id = "${local.project_name}-gcs-access-key-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "storage"
  }
}

resource "google_secret_manager_secret_version" "gcs_access_key" {
  secret      = google_secret_manager_secret.gcs_access_key.id
  secret_data = var.gcs_access_key
}

resource "google_secret_manager_secret" "gcs_secret_key" {
  secret_id = "${local.project_name}-gcs-secret-key-${local.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = local.environment
    service     = "storage"
  }
}

resource "google_secret_manager_secret_version" "gcs_secret_key" {
  secret      = google_secret_manager_secret.gcs_secret_key.id
  secret_data = var.gcs_secret_key
}

resource "google_storage_bucket_iam_member" "engine_storage_admin" {
  bucket = module.storage.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${local.engine_sa}"
}

resource "google_storage_bucket_iam_member" "worker_storage_admin" {
  bucket = module.storage.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${local.worker_sa}"
}

resource "google_secret_manager_secret_iam_member" "engine_gcs_secrets" {
  for_each  = toset(["gcs-access-key", "gcs-secret-key"])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.engine_sa}"
  project   = var.project_id

  depends_on = [
    google_secret_manager_secret.gcs_access_key,
    google_secret_manager_secret.gcs_secret_key
  ]
}
resource "google_secret_manager_secret_iam_member" "worker_gcs_secrets" {
  for_each  = toset(["gcs-access-key", "gcs-secret-key"])
  secret_id = "${local.project_name}-${each.value}-${local.environment}"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.worker_sa}"
  project   = var.project_id

  depends_on = [
    google_secret_manager_secret.gcs_access_key,
    google_secret_manager_secret.gcs_secret_key
  ]
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

  machine_type = "n2-standard-2"
  preemptible  = true

  boot_disk_size = 30
  data_disk_size = 50
  data_disk_type = "pd-balanced"

  vespa_version = var.vespa_version

  allowed_source_ranges = ["10.0.0.0/24"]

  enable_snapshot_schedule = false

  service_account_email = local.vespa_sa
}

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

module "server" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "server"
  environment  = local.environment
  region       = var.region
  image        = local.server_image

  min_instances = 0
  max_instances = 2

  cpu    = "1"
  memory = "1Gi"

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id

  env_vars = {
    NODE_ENV            = "development"
    VESPA_URL           = module.vespa.vespa_query_url
    BETTER_AUTH_URL     = local.server_url
    CORS_ORIGIN         = local.web_url
    COOKIE_DOMAIN       = var.cookie_domain != "" ? var.cookie_domain : (var.web_domain != "" ? ".${replace(var.web_domain, "/^[^.]+\\./", "")}" : "")
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
    ENCRYPTION_KEY = {
      secret_id = google_secret_manager_secret.encryption_key.secret_id
      version   = "latest"
    }
    OPENAI_API_KEY = {
      secret_id = google_secret_manager_secret.openai_api_key.secret_id
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

module "worker" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "worker"
  environment  = local.environment
  region       = var.region
  image        = local.worker_image
  // TODO: Change to 0 when stopping to test and 1 when starting to test
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

  startup_probe_enabled = true
  startup_probe_path     = "/metrics"

  env_vars = {
    NODE_ENV             = "development"
    VESPA_URL            = module.vespa.vespa_feed_url
    BETTER_AUTH_URL      = local.server_url
    CORS_ORIGIN          = local.web_url
    OPENAI_BASE_URL      = var.openai_base_url
    OPENAI_ORGANIZATION  = var.openai_organization
    # File processing config
    ENGINE_URL           = module.engine.service_url
    GCS_BUCKET           = module.storage.name
    GCS_REGION           = var.region
    GCS_ENDPOINT         = "https://storage.googleapis.com"
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
    ENCRYPTION_KEY = {
      secret_id = google_secret_manager_secret.encryption_key.secret_id
      version   = "latest"
    }
    OPENAI_API_KEY = {
      secret_id = google_secret_manager_secret.openai_api_key.secret_id
      version   = "latest"
    }
    # GCS S3-compatible credentials
    GCS_ACCESS_KEY_ID = {
      secret_id = google_secret_manager_secret.gcs_access_key.secret_id
      version   = "latest"
    }
    GCS_SECRET_ACCESS_KEY = {
      secret_id = google_secret_manager_secret.gcs_secret_key.secret_id
      version   = "latest"
    }
  }

  allow_public_access   = false
  service_account_email = local.worker_sa

  depends_on = [
    google_secret_manager_secret_iam_member.worker_secrets,
    google_secret_manager_secret_iam_member.worker_auth_secrets,
    google_secret_manager_secret_iam_member.worker_gcs_secrets,
    module.engine  # Worker depends on engine for ENGINE_URL
  ]

  deletion_protection = false
}

module "engine" {
  source = "../../modules/cloud-run"

  project_id   = var.project_id
  project_name = local.project_name
  service_name = "engine"
  environment  = local.environment
  region       = var.region
  image        = local.engine_image

  min_instances = 0
  max_instances = 2

  cpu              = "2"
  memory           = "4Gi"
  cpu_idle         = true
  startup_cpu_boost = true
  timeout          = "300s"
  container_port   = 8000

  vpc_egress_enabled = true
  vpc_network_id     = module.networking.network_id
  vpc_subnetwork_id  = module.networking.cloud_run_subnet_id

  startup_probe_enabled           = true
  startup_probe_path              = "/health"
  startup_probe_initial_delay     = 10
  startup_probe_timeout           = 5
  startup_probe_period            = 15
  startup_probe_failure_threshold = 5

  env_vars = {
    ENVIRONMENT  = local.environment
    LOG_LEVEL    = "INFO"
    DEBUG        = "false"
    S3_BUCKET    = module.storage.name
    S3_REGION    = var.region
    S3_ENDPOINT  = "https://storage.googleapis.com"
  }

  secret_env_vars = {
    REDIS_URL = {
      secret_id = module.redis.redis_url_secret_id
      version   = "latest"
    }
    S3_ACCESS_KEY = {
      secret_id = google_secret_manager_secret.gcs_access_key.secret_id
      version   = "latest"
    }
    S3_SECRET_KEY = {
      secret_id = google_secret_manager_secret.gcs_secret_key.secret_id
      version   = "latest"
    }
  }

  allow_public_access       = false
  invoker_service_accounts  = [local.worker_sa]
  service_account_email     = local.engine_sa

  depends_on = [
    google_secret_manager_secret_iam_member.engine_gcs_secrets,
    google_secret_manager_secret_iam_member.engine_redis_secret
  ]

  deletion_protection = false
}

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
    NEXT_PUBLIC_API_URL = local.server_url
    BETTER_AUTH_URL     = local.server_url
    CORS_ORIGIN         = local.web_url
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

