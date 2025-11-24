terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

resource "google_redis_instance" "redis" {
  name               = "${var.project_name}-redis-${var.environment}"
  display_name       = "OpenPlane Redis ${var.environment}"
  tier               = var.tier
  memory_size_gb     = var.memory_size_gb
  region             = var.region
  project            = var.project_id
  redis_version      = var.redis_version
  replica_count      = var.replica_count
  read_replicas_mode = var.replica_count > 0 ? "READ_REPLICAS_ENABLED" : "READ_REPLICAS_DISABLED"

  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_configs = merge(
    var.redis_configs,
    {
      "maxmemory-policy" = "allkeys-lru"
      "notify-keyspace-events" = "Ex"
      "timeout" = "300"
    }
  )

  maintenance_policy {
    weekly_maintenance_window {
      day = var.maintenance_window_day
      start_time {
        hours   = var.maintenance_window_hour
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  dynamic "persistence_config" {
    for_each = var.tier == "STANDARD_HA" ? [1] : []
    content {
      persistence_mode    = var.persistence_mode
      rdb_snapshot_period = var.rdb_snapshot_period
    }
  }

  labels = merge(
    var.labels,
    {
      environment = var.environment
      service     = "cache-queue"
      managed_by  = "terraform"
    }
  )

  lifecycle {
    prevent_destroy = false
  }
}

resource "google_secret_manager_secret" "redis_host" {
  secret_id = "${var.project_name}-redis-host-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    service     = "cache-queue"
  }
}

resource "google_secret_manager_secret_version" "redis_host" {
  secret      = google_secret_manager_secret.redis_host.id
  secret_data = google_redis_instance.redis.host
}

resource "google_secret_manager_secret" "redis_port" {
  secret_id = "${var.project_name}-redis-port-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    service     = "cache-queue"
  }
}

resource "google_secret_manager_secret_version" "redis_port" {
  secret      = google_secret_manager_secret.redis_port.id
  secret_data = tostring(google_redis_instance.redis.port)
}

resource "google_secret_manager_secret" "redis_url" {
  secret_id = "${var.project_name}-redis-url-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    service     = "cache-queue"
  }
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = var.auth_enabled ? "redis://:${google_redis_instance.redis.auth_string}@${google_redis_instance.redis.host}:${google_redis_instance.redis.port}" : "redis://${google_redis_instance.redis.host}:${google_redis_instance.redis.port}"
}

resource "google_secret_manager_secret" "redis_auth_string" {
  count     = var.auth_enabled ? 1 : 0
  secret_id = "${var.project_name}-redis-auth-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    service     = "cache-queue"
  }
}

resource "google_secret_manager_secret_version" "redis_auth_string" {
  count       = var.auth_enabled ? 1 : 0
  secret      = google_secret_manager_secret.redis_auth_string[0].id
  secret_data = google_redis_instance.redis.auth_string
}

