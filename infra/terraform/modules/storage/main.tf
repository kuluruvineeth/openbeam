terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

resource "google_storage_bucket" "bucket" {
  name                        = var.name
  location                    = var.location
  project                     = var.project_id
  storage_class               = var.storage_class
  uniform_bucket_level_access = var.uniform_bucket_level_access
  force_destroy               = var.force_destroy

  versioning {
    enabled = var.versioning_enabled
  }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      action {
        type          = lifecycle_rule.value.action.type
        storage_class = lifecycle_rule.value.action.storage_class
      }
      condition {
        age                   = lifecycle_rule.value.condition.age
        created_before        = lifecycle_rule.value.condition.created_before
        with_state            = lifecycle_rule.value.condition.with_state
        matches_storage_class = lifecycle_rule.value.condition.matches_storage_class
        num_newer_versions    = lifecycle_rule.value.condition.num_newer_versions
      }
    }
  }

  dynamic "cors" {
    for_each = var.cors
    content {
      origin          = cors.value.origin
      method          = cors.value.method
      response_header = cors.value.response_header
      max_age_seconds = cors.value.max_age_seconds
    }
  }

  labels = merge(
    var.labels,
    {
      environment = var.environment
      managed_by  = "terraform"
    }
  )
}

resource "google_secret_manager_secret" "bucket_name" {
  secret_id = "${var.project_name}-bucket-name-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    service     = "storage"
  }
}

resource "google_secret_manager_secret_version" "bucket_name" {
  secret      = google_secret_manager_secret.bucket_name.id
  secret_data = google_storage_bucket.bucket.name
}
