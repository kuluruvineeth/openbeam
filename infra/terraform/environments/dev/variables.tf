# ==============================================================================
# Development Environment Variables
# ==============================================================================

variable "project_id" {
  description = "GCP project ID for development"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for Compute Engine"
  type        = string
  default     = "us-central1-a"
}

variable "github_org" {
  description = "GitHub organization/user for container images"
  type        = string
  default     = "kuluruvineeth"
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

