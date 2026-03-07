terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

resource "google_compute_network" "vpc" {
  name                    = "${var.project_name}-vpc-${var.environment}"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  description             = "VPC network for OpenBeam ${var.environment} environment"
}

resource "google_compute_subnetwork" "cloud_run" {
  name          = "${var.project_name}-cloudrun-${var.environment}"
  ip_cidr_range = var.cloud_run_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id
  description   = "Subnet for Cloud Run services with Direct VPC Egress"

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_subnet_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_subnet_cidr
  }
}

resource "google_compute_subnetwork" "compute" {
  name          = "${var.project_name}-compute-${var.environment}"
  ip_cidr_range = var.compute_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id
  description   = "Subnet for Compute Engine instances (Vespa)"

  private_ip_google_access = true
}

resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.project_name}-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
  description   = "Private IP range for Cloud SQL and Redis"
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

resource "google_compute_router" "router" {
  name    = "${var.project_name}-router-${var.environment}"
  region  = var.region
  network = google_compute_network.vpc.id

  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.project_name}-nat-${var.environment}"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

resource "google_compute_firewall" "allow_internal" {
  name    = "${var.project_name}-allow-internal-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    var.cloud_run_subnet_cidr,
    var.compute_subnet_cidr,
    google_compute_global_address.private_ip_range.address
  ]

  description = "Allow all internal traffic within VPC"
}

resource "google_compute_firewall" "allow_health_checks" {
  name    = "${var.project_name}-allow-health-checks-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
  }

  source_ranges = [
    "35.191.0.0/16",
    "130.211.0.0/22"
  ]

  target_tags = ["allow-health-checks"]
  description = "Allow health checks from Google Cloud Load Balancer"
}

resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "${var.project_name}-allow-iap-ssh-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["allow-iap-ssh"]
  description   = "Allow SSH from Identity-Aware Proxy"
}

resource "google_compute_firewall" "allow_metrics" {
  count   = var.enable_metrics_scraping ? 1 : 0
  name    = "${var.project_name}-allow-metrics-${var.environment}"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["9090", "9091", "9121"]
  }

  source_ranges = [var.cloud_run_subnet_cidr, var.compute_subnet_cidr]
  target_tags   = ["metrics-endpoint"]
  description   = "Allow Prometheus metrics scraping"
}

