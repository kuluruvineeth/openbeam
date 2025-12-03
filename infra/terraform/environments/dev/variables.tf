
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

variable "encryption_key" {
  description = "AES-256-GCM encryption key for OAuth credentials (64 hex chars). Generate with: openssl rand -hex 32"
  type        = string
  sensitive   = true
}

variable "redeploy_id" {
  type = string
}

variable "vespa_version" {
  description = "Vespa Docker image version"
  type        = string
  default     = "8.613.57"
}

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

variable "cookie_domain" {
  description = "Cookie domain for auth (e.g., .openplane.tech for all subdomains)"
  type        = string
  default     = ""
}
variable "openai_api_key" {
  description = "OpenAI API key for embeddings"
  type        = string
  sensitive   = true
}

variable "openai_base_url" {
  description = "OpenAI API base URL"
  type        = string
  default     = "https://api.openai.com/v1"
}

variable "openai_organization" {
  description = "OpenAI organization ID"
  type        = string
  default     = ""
}

