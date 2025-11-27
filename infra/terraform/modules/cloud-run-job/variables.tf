variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "job_name" {
  description = "Name of the job (e.g., 'db-migrate')"
  type        = string
}

variable "environment" {
  description = "Environment (dev, prod)"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "image" {
  description = "Container image URL"
  type        = string
}

variable "command" {
  description = "Command to run in the container"
  type        = list(string)
  default     = []
}

variable "args" {
  description = "Arguments for the command"
  type        = list(string)
  default     = []
}

variable "env_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Secret environment variables from Secret Manager"
  type = map(object({
    secret_id = string
    version   = string
  }))
  default = {}
}

variable "cpu" {
  description = "CPU allocation"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory allocation"
  type        = string
  default     = "512Mi"
}

variable "timeout" {
  description = "Maximum execution time"
  type        = string
  default     = "600s"
}

variable "max_retries" {
  description = "Maximum retry attempts"
  type        = number
  default     = 0
}

variable "service_account_email" {
  description = "Service account email"
  type        = string
}

variable "vpc_egress_enabled" {
  description = "Enable VPC egress"
  type        = bool
  default     = false
}

variable "vpc_network_id" {
  description = "VPC network ID"
  type        = string
  default     = ""
}

variable "vpc_subnetwork_id" {
  description = "VPC subnetwork ID"
  type        = string
  default     = ""
}

variable "labels" {
  description = "Additional labels"
  type        = map(string)
  default     = {}
}
