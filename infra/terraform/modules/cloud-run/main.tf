terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

resource "google_cloud_run_v2_service" "service" {
  name     = "${var.project_name}-${var.service_name}-${var.environment}"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle          = var.cpu_idle
        startup_cpu_boost = var.startup_cpu_boost
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = env.value.version
            }
          }
        }
      }

      dynamic "startup_probe" {
        for_each = var.startup_probe_enabled ? [1] : []
        content {
          initial_delay_seconds = var.startup_probe_initial_delay
          timeout_seconds       = var.startup_probe_timeout
          period_seconds        = var.startup_probe_period
          failure_threshold     = var.startup_probe_failure_threshold
          http_get {
            path = var.startup_probe_path
            port = var.container_port
          }
        }
      }

      dynamic "liveness_probe" {
        for_each = var.liveness_probe_enabled ? [1] : []
        content {
          initial_delay_seconds = var.liveness_probe_initial_delay
          timeout_seconds       = var.liveness_probe_timeout
          period_seconds        = var.liveness_probe_period
          failure_threshold     = var.liveness_probe_failure_threshold
          http_get {
            path = var.liveness_probe_path
            port = var.container_port
          }
        }
      }

      ports {
        name           = "http1"
        container_port = var.container_port
      }
    }

    dynamic "vpc_access" {
      for_each = var.vpc_egress_enabled ? [1] : []
      content {
        network_interfaces {
          network    = var.vpc_network_id
          subnetwork = var.vpc_subnetwork_id
          tags       = var.network_tags
        }
        egress = var.vpc_egress_mode
      }
    }

    service_account = var.service_account_email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    timeout = var.timeout
    session_affinity = var.session_affinity
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  deletion_protection = var.deletion_protection

  labels = merge(
    var.labels,
    {
      environment = var.environment
      service     = var.service_name
      managed_by  = "terraform"
    }
  )

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  count    = var.allow_public_access ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "service_account_access" {
  for_each = toset(var.invoker_service_accounts)
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${each.value}"
}

