terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

resource "google_artifact_registry_repository" "repo" {
  location      = var.location
  repository_id = var.repository_id
  description   = var.description
  format        = var.format
  project       = var.project_id

  labels = merge(
    var.labels,
    {
      managed_by = "terraform"
    }
  )

  # Cleanup policy: Keep only latest + last 3 versions
  cleanup_policies {
    id     = "keep-latest"
    action = "KEEP"

    most_recent_versions {
      keep_count = 4
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"

    condition {
      tag_state = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }
}
