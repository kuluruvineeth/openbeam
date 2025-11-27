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

# ==============================================================================
# Auth & OAuth Secrets
# ==============================================================================

variable "better_auth_secret" {
  description = "Better Auth secret key"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key for server"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}


# This is used to redeploy the services
variable "redeploy_id" {
  type = string
}

# ==============================================================================
# Custom Domain URLs
# ==============================================================================

variable "server_domain" {
  description = "Custom domain for server (e.g., api.openplane.tech)"
  type        = string
  default     = ""
}

variable "web_domain" {
  description = "Custom domain for web (e.g., dev.openplane.tech)"
  type        = string
  default     = ""
}

