variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "cloud_run_subnet_cidr" {
  description = "CIDR range for Cloud Run subnet (Direct VPC Egress)"
  type        = string
  default     = "10.0.0.0/24"
}

variable "compute_subnet_cidr" {
  description = "CIDR range for Compute Engine subnet (Vespa)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "pods_subnet_cidr" {
  description = "CIDR range for Kubernetes pods (future GKE support)"
  type        = string
  default     = "10.1.0.0/16"
}

variable "services_subnet_cidr" {
  description = "CIDR range for Kubernetes services (future GKE support)"
  type        = string
  default     = "10.2.0.0/16"
}

variable "enable_metrics_scraping" {
  description = "Enable firewall rules for Prometheus metrics scraping"
  type        = bool
  default     = true
}

