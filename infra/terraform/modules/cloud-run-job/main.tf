
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

resource "google_cloud_run_v2_job" "job" {
  name     = "${var.project_name}-${var.job_name}-${var.environment}"
  location = var.region
  project  = var.project_id

  labels = merge(
    var.labels,
    {
      environment = var.environment
      managed_by  = "terraform"
      job         = var.job_name
    }
  )

  template {
    template {
      service_account = var.service_account_email
      timeout         = var.timeout
  
      dynamic "vpc_access" {
        for_each = var.vpc_egress_enabled ? [1] : []
        content {
          network_interfaces {
            network    = var.vpc_network_id
            subnetwork = var.vpc_subnetwork_id
            tags       = []
          }
          egress = "PRIVATE_RANGES_ONLY"
        }
      }

      containers {
        image   = var.image
        command = var.command
        args    = var.args

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

        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
      }

      max_retries = var.max_retries
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image
    ]
  }
}
