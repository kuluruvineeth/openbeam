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
  description = "GCP region for Cloud SQL instance"
  type        = string
  default     = "us-central1"
}

variable "network_id" {
  description = "VPC network ID for private IP"
  type        = string
}

variable "private_vpc_connection_id" {
  description = "Private VPC connection ID (dependency)"
  type        = string
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "tier" {
  description = "Machine type for Cloud SQL instance"
  type        = string
  default     = "db-custom-2-8192"
}

variable "high_availability" {
  description = "Enable high availability (REGIONAL)"
  type        = bool
  default     = true
}

variable "disk_size" {
  description = "Initial disk size in GB"
  type        = number
  default     = 100
}

variable "disk_autoresize_limit" {
  description = "Maximum disk size in GB for autoresize"
  type        = number
  default     = 500
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "openplane"
}

variable "database_user" {
  description = "Database user name"
  type        = string
  default     = "openplane"
}

variable "database_password" {
  description = "Database password (leave empty to generate random)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "backup_start_time" {
  description = "Backup start time (HH:MM format, UTC)"
  type        = string
  default     = "03:00"
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "backup_retention_count" {
  description = "Number of backups to retain"
  type        = number
  default     = 7
}

variable "maintenance_window_day" {
  description = "Day of week for maintenance (1=Monday, 7=Sunday)"
  type        = number
  default     = 7
}

variable "maintenance_window_hour" {
  description = "Hour of day for maintenance (0-23, UTC)"
  type        = number
  default     = 3
}

variable "database_flags" {
  description = "PostgreSQL database flags"
  type = list(object({
    name  = string
    value = string
  }))
  default = [
    {
      name  = "max_connections"
      value = "100"
    },
    {
      name  = "shared_buffers"
      value = "32768"  # ~128MB, safe for small instances
    },
    {
      name  = "effective_cache_size"
      value = "65536"  # ~256MB, safe for small instances
    },
    {
      name  = "maintenance_work_mem"
      value = "65536"  # ~256MB
    },
    {
      name  = "checkpoint_completion_target"
      value = "0.9"
    },
    {
      name  = "wal_buffers"
      value = "-1"  # Auto-tune
    },
    {
      name  = "default_statistics_target"
      value = "100"
    },
    {
      name  = "random_page_cost"
      value = "1.1"
    },
    {
      name  = "effective_io_concurrency"
      value = "200"
    },
    {
      name  = "work_mem"
      value = "4096"  # ~16MB, safe for small instances
    }
  ]
}

variable "labels" {
  description = "Additional labels for resources"
  type        = map(string)
  default     = {}
}

variable "enable_public_ip" {
  description = "Enable public IP for the database (useful for dev environments)"
  type        = bool
  default     = false
}

variable "authorized_networks" {
  description = "List of authorized networks for public IP access"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

