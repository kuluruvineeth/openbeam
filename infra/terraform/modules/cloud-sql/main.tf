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
}

resource "random_id" "db_name_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.project_name}-db-${var.environment}-${random_id.db_name_suffix.hex}"
  database_version = var.database_version
  region           = var.region
  project          = var.project_id

  deletion_protection = var.environment == "prod" ? true : false

  settings {
    tier              = var.tier
    availability_type = var.high_availability ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = var.disk_size
    disk_autoresize   = true
    disk_autoresize_limit = var.disk_autoresize_limit

    ip_configuration {
      ipv4_enabled                                  = var.enable_public_ip
      private_network                               = var.network_id
      enable_private_path_for_google_cloud_services = true

      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.value
        }
      }
    }

    backup_configuration {
      enabled                        = true
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = var.point_in_time_recovery
      transaction_log_retention_days = var.environment == "prod" ? 7 : 3
      backup_retention_settings {
        retained_backups = var.backup_retention_count
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = var.maintenance_window_day
      hour         = var.maintenance_window_hour
      update_track = "stable"
    }

    dynamic "database_flags" {
      for_each = var.database_flags
      content {
        name  = database_flags.value.name
        value = database_flags.value.value
      }
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    user_labels = merge(
      var.labels,
      {
        environment = var.environment
        service     = "database"
        managed_by  = "terraform"
      }
    )
  }

  depends_on = [var.private_vpc_connection_id]

  lifecycle {
    ignore_changes = [name]
  }
}

resource "google_sql_database" "openplane" {
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "google_sql_user" "openplane" {
  name     = var.database_user
  instance = google_sql_database_instance.postgres.name
  password = var.database_password != "" ? var.database_password : random_password.db_password.result
  project  = var.project_id
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.project_name}-db-password-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    service     = "database"
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.database_password != "" ? var.database_password : random_password.db_password.result
}

resource "google_secret_manager_secret" "db_connection_string" {
  secret_id = "${var.project_name}-db-connection-string-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    service     = "database"
  }
}

resource "google_secret_manager_secret_version" "db_connection_string" {
  secret = google_secret_manager_secret.db_connection_string.id
  secret_data = "postgresql://${google_sql_user.openplane.name}:${urlencode(var.database_password != "" ? var.database_password : random_password.db_password.result)}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.openplane.name}?sslmode=require"
}

