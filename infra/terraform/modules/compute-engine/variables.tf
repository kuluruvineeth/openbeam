variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for Compute Engine instance"
  type        = string
  default     = "us-central1-a"
}

variable "network_id" {
  description = "VPC network ID"
  type        = string
}

variable "network_name" {
  description = "VPC network name (for firewall rules)"
  type        = string
}

variable "subnetwork_id" {
  description = "VPC subnetwork ID"
  type        = string
}

variable "machine_type" {
  description = "Compute Engine machine type"
  type        = string
  default     = "n2-standard-4"
}

variable "image" {
  description = "OS image for the instance"
  type        = string
  default     = "ubuntu-os-cloud/ubuntu-2204-lts"
}

variable "preemptible" {
  description = "Use preemptible instance (cheaper, can be stopped by Google)"
  type        = bool
  default     = false
}

variable "boot_disk_size" {
  description = "Boot disk size in GB"
  type        = number
  default     = 50
}

variable "boot_disk_type" {
  description = "Boot disk type (pd-standard, pd-balanced, pd-ssd)"
  type        = string
  default     = "pd-balanced"
}

variable "data_disk_size" {
  description = "Data disk size in GB for Vespa data"
  type        = number
  default     = 200
}

variable "data_disk_type" {
  description = "Data disk type (pd-standard, pd-balanced, pd-ssd)"
  type        = string
  default     = "pd-ssd"
}

variable "vespa_version" {
  description = "Vespa Docker image version"
  type        = string
  default     = "8.269.17"
}

variable "service_account_email" {
  description = "Service account email for the instance"
  type        = string
}

variable "allowed_source_ranges" {
  description = "Source IP ranges allowed to access Vespa"
  type        = list(string)
  default     = ["10.0.0.0/8"]
}

variable "additional_tags" {
  description = "Additional network tags"
  type        = list(string)
  default     = []
}

variable "enable_snapshot_schedule" {
  description = "Enable automated snapshot schedule"
  type        = bool
  default     = true
}

variable "snapshot_schedule_name" {
  description = "Name of existing snapshot schedule (leave empty to create new)"
  type        = string
  default     = ""
}

variable "snapshot_start_time" {
  description = "Snapshot start time (HH:MM format, UTC)"
  type        = string
  default     = "02:00"
}

variable "snapshot_retention_days" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 7
}

variable "metadata" {
  description = "Additional instance metadata"
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Additional labels for resources"
  type        = map(string)
  default     = {}
}

