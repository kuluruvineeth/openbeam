terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

resource "google_compute_instance" "vespa" {
  name         = "${var.project_name}-vespa-${var.environment}"
  machine_type = var.machine_type
  zone         = var.zone
  project      = var.project_id

  boot_disk {
    initialize_params {
      image = var.image
      size  = var.boot_disk_size
      type  = var.boot_disk_type
    }
  }

  attached_disk {
    source      = google_compute_disk.vespa_data.id
    device_name = "vespa-data"
    mode        = "READ_WRITE"
  }

  network_interface {
    network    = var.network_id
    subnetwork = var.subnetwork_id
  }

  service_account {
    email  = var.service_account_email
    scopes = ["cloud-platform"]
  }

  metadata = merge(
    var.metadata,
    {
      enable-oslogin = "TRUE"
      startup-script = templatefile("${path.module}/scripts/startup.sh", {
        vespa_version    = var.vespa_version
        data_disk_device = "/dev/disk/by-id/google-vespa-data"
        data_mount_point = "/opt/vespa-data"
      })
    }
  )

  tags = concat(
    ["allow-iap-ssh", "metrics-endpoint", "vespa-server"],
    var.additional_tags
  )

  labels = merge(
    var.labels,
    {
      environment = var.environment
      service     = "search-engine"
      managed_by  = "terraform"
    }
  )

  scheduling {
    preemptible         = var.preemptible
    automatic_restart   = !var.preemptible
    on_host_maintenance = var.preemptible ? "TERMINATE" : "MIGRATE"
  }

  allow_stopping_for_update = true

  lifecycle {
    ignore_changes = [
      metadata["startup-script"],
    ]
  }
}

resource "google_compute_disk" "vespa_data" {
  name    = "${var.project_name}-vespa-data-${var.environment}"
  type    = var.data_disk_type
  zone    = var.zone
  size    = var.data_disk_size
  project = var.project_id

  labels = {
    environment = var.environment
    service     = "search-engine"
  }
}

resource "google_compute_firewall" "vespa_ports" {
  name    = "${var.project_name}-allow-vespa-${var.environment}"
  network = var.network_name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["8080", "19071", "19100"]
  }

  source_ranges = var.allowed_source_ranges
  target_tags   = ["vespa-server"]

  description = "Allow Vespa ports from Cloud Run services"
}

resource "google_compute_resource_policy" "vespa_snapshot_schedule" {
  count   = var.enable_snapshot_schedule ? 1 : 0
  name    = "${var.project_name}-vespa-snapshot-${var.environment}"
  region  = var.region
  project = var.project_id

  snapshot_schedule_policy {
    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = var.snapshot_start_time
      }
    }

    retention_policy {
      max_retention_days    = var.snapshot_retention_days
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    snapshot_properties {
      labels = {
        environment = var.environment
        service     = "search-engine"
        type        = "automated"
      }
      storage_locations = [var.region]
    }
  }
}

resource "google_compute_disk_resource_policy_attachment" "vespa_data" {
  count   = var.enable_snapshot_schedule ? 1 : 0
  name    = google_compute_resource_policy.vespa_snapshot_schedule[0].name
  disk    = google_compute_disk.vespa_data.name
  zone    = var.zone
  project = var.project_id
}

