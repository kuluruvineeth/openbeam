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
  description = "GCP region for Redis instance"
  type        = string
  default     = "us-central1"
}

variable "network_id" {
  description = "VPC network ID for private IP"
  type        = string
}

variable "tier" {
  description = "Redis service tier (BASIC or STANDARD_HA)"
  type        = string
  default     = "STANDARD_HA"
  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.tier)
    error_message = "Tier must be BASIC or STANDARD_HA"
  }
}

variable "memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 5
  validation {
    condition     = var.memory_size_gb >= 1 && var.memory_size_gb <= 300
    error_message = "Memory size must be between 1 and 300 GB"
  }
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "REDIS_7_0"
}

variable "replica_count" {
  description = "Number of read replicas (0-5, STANDARD_HA only)"
  type        = number
  default     = 1
  validation {
    condition     = var.replica_count >= 0 && var.replica_count <= 5
    error_message = "Replica count must be between 0 and 5"
  }
}

variable "auth_enabled" {
  description = "Enable Redis AUTH"
  type        = bool
  default     = true
}

variable "redis_configs" {
  description = "Additional Redis configuration parameters"
  type        = map(string)
  default     = {}
}

variable "maintenance_window_day" {
  description = "Day of week for maintenance (MONDAY, TUESDAY, etc.)"
  type        = string
  default     = "SUNDAY"
}

variable "maintenance_window_hour" {
  description = "Hour of day for maintenance (0-23, UTC)"
  type        = number
  default     = 3
}

variable "persistence_mode" {
  description = "Persistence mode (RDB, AOF, DISABLED)"
  type        = string
  default     = "RDB"
  validation {
    condition     = contains(["RDB", "AOF", "DISABLED"], var.persistence_mode)
    error_message = "Persistence mode must be RDB, AOF, or DISABLED"
  }
}

variable "rdb_snapshot_period" {
  description = "RDB snapshot period (ONE_HOUR, SIX_HOURS, TWELVE_HOURS, TWENTY_FOUR_HOURS)"
  type        = string
  default     = "TWELVE_HOURS"
}

variable "labels" {
  description = "Additional labels for resources"
  type        = map(string)
  default     = {}
}

