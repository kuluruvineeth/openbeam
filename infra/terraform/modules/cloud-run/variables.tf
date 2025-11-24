variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "service_name" {
  description = "Service name (server, web, docs, worker)"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run service"
  type        = string
  default     = "us-central1"
}

variable "image" {
  description = "Container image URL"
  type        = string
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "cpu" {
  description = "CPU allocation (1, 2, 4, 8)"
  type        = string
  default     = "1"
  validation {
    condition     = contains(["1", "2", "4", "8"], var.cpu)
    error_message = "CPU must be 1, 2, 4, or 8"
  }
}

variable "memory" {
  description = "Memory allocation (e.g., 512Mi, 1Gi, 2Gi, 4Gi)"
  type        = string
  default     = "512Mi"
}

variable "cpu_idle" {
  description = "Allocate CPU only during request processing"
  type        = bool
  default     = true
}

variable "startup_cpu_boost" {
  description = "Enable CPU boost during startup"
  type        = bool
  default     = true
}

variable "timeout" {
  description = "Request timeout (max 3600s for gen2)"
  type        = string
  default     = "300s"
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 3000
}

variable "vpc_egress_enabled" {
  description = "Enable Direct VPC Egress"
  type        = bool
  default     = false
}

variable "vpc_network_id" {
  description = "VPC network ID for Direct VPC Egress"
  type        = string
  default     = ""
}

variable "vpc_subnetwork_id" {
  description = "VPC subnetwork ID for Direct VPC Egress"
  type        = string
  default     = ""
}

variable "vpc_egress_mode" {
  description = "VPC egress mode (PRIVATE_RANGES_ONLY or ALL_TRAFFIC)"
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
  validation {
    condition     = contains(["PRIVATE_RANGES_ONLY", "ALL_TRAFFIC"], var.vpc_egress_mode)
    error_message = "VPC egress mode must be PRIVATE_RANGES_ONLY or ALL_TRAFFIC"
  }
}

variable "network_tags" {
  description = "Network tags for firewall rules"
  type        = list(string)
  default     = []
}

variable "env_vars" {
  description = "Environment variables (plain text)"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Environment variables from Secret Manager"
  type = map(object({
    secret_id = string
    version   = string
  }))
  default = {}
}

variable "service_account_email" {
  description = "Service account email for Cloud Run service"
  type        = string
}

variable "allow_public_access" {
  description = "Allow public (unauthenticated) access"
  type        = bool
  default     = false
}

variable "invoker_service_accounts" {
  description = "Service accounts allowed to invoke this service"
  type        = list(string)
  default     = []
}

variable "startup_probe_enabled" {
  description = "Enable startup probe"
  type        = bool
  default     = false
}

variable "startup_probe_path" {
  description = "Startup probe HTTP path"
  type        = string
  default     = "/health"
}

variable "startup_probe_initial_delay" {
  description = "Startup probe initial delay in seconds"
  type        = number
  default     = 0
}

variable "startup_probe_timeout" {
  description = "Startup probe timeout in seconds"
  type        = number
  default     = 1
}

variable "startup_probe_period" {
  description = "Startup probe period in seconds"
  type        = number
  default     = 10
}

variable "startup_probe_failure_threshold" {
  description = "Startup probe failure threshold"
  type        = number
  default     = 3
}

variable "liveness_probe_enabled" {
  description = "Enable liveness probe"
  type        = bool
  default     = false
}

variable "liveness_probe_path" {
  description = "Liveness probe HTTP path"
  type        = string
  default     = "/health"
}

variable "liveness_probe_initial_delay" {
  description = "Liveness probe initial delay in seconds"
  type        = number
  default     = 10
}

variable "liveness_probe_timeout" {
  description = "Liveness probe timeout in seconds"
  type        = number
  default     = 1
}

variable "liveness_probe_period" {
  description = "Liveness probe period in seconds"
  type        = number
  default     = 10
}

variable "liveness_probe_failure_threshold" {
  description = "Liveness probe failure threshold"
  type        = number
  default     = 3
}

variable "session_affinity" {
  description = "Enable session affinity (sticky sessions)"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Additional labels for resources"
  type        = map(string)
  default     = {}
}

