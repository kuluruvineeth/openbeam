variable "resource_group_name" {
  description = "Resource group to deploy into"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment identifier (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "sku_name" {
  description = "SKU for the PostgreSQL Flexible Server"
  type        = string
  default     = "B_Standard_B2ms"
}

variable "storage_mb" {
  description = "Storage size in megabytes"
  type        = number
  default     = 32768
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "geo_redundant_backup_enabled" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = false
}

variable "zone" {
  description = "Availability zone for the primary server"
  type        = string
  default     = null
}

variable "delegated_subnet_id" {
  description = "Subnet ID delegated to PostgreSQL Flexible Server"
  type        = string
  default     = null
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID for server FQDN resolution"
  type        = string
  default     = null
}

variable "ha_mode" {
  description = "High availability mode: disabled, ZoneRedundant, or SameZone"
  type        = string
  default     = "disabled"

  validation {
    condition     = contains(["disabled", "ZoneRedundant", "SameZone"], var.ha_mode)
    error_message = "HA mode must be disabled, ZoneRedundant, or SameZone."
  }
}

variable "admin_username" {
  description = "Administrator login name"
  type        = string
  default     = "pgadmin"
}

variable "admin_password" {
  description = "Administrator password"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
