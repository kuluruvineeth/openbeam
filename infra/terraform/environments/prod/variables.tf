
variable "project_id" {
  description = "GCP project ID for production"
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
  description = "Container image tag (commit SHA or version)"
  type        = string
  default     = "latest"
}


variable "cloud_run_subnet_cidr" {
  description = "CIDR range for Cloud Run subnet"
  type        = string
  default     = "10.0.0.0/24"
}

variable "compute_subnet_cidr" {
  description = "CIDR range for Compute Engine subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "pods_subnet_cidr" {
  description = "CIDR range for Kubernetes pods (future)"
  type        = string
  default     = "10.1.0.0/16"
}

variable "services_subnet_cidr" {
  description = "CIDR range for Kubernetes services (future)"
  type        = string
  default     = "10.2.0.0/16"
}

variable "cloud_sql_tier" {
  description = "Cloud SQL machine type"
  type        = string
  default     = "db-custom-2-8192" # 2 vCPU, 8GB RAM
}

variable "cloud_sql_high_availability" {
  description = "Enable high availability (REGIONAL)"
  type        = bool
  default     = true
}

variable "cloud_sql_disk_size" {
  description = "Initial disk size in GB"
  type        = number
  default     = 100
}

variable "cloud_sql_disk_autoresize_limit" {
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

variable "redis_tier" {
  description = "Redis service tier"
  type        = string
  default     = "STANDARD_HA"
  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.redis_tier)
    error_message = "Redis tier must be BASIC or STANDARD_HA"
  }
}

variable "redis_memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 5
}

variable "redis_replica_count" {
  description = "Number of read replicas"
  type        = number
  default     = 1
}

variable "vespa_machine_type" {
  description = "Vespa Compute Engine machine type"
  type        = string
  default     = "n2-standard-4" # 4 vCPU, 16GB RAM
}

variable "vespa_data_disk_size" {
  description = "Vespa data disk size in GB"
  type        = number
  default     = 200
}

variable "vespa_version" {
  description = "Vespa Docker image version"
  type        = string
  default     = "8.613.57"
}

variable "server_min_instances" {
  description = "Minimum server instances (always-on for API)"
  type        = number
  default     = 1
}

variable "server_max_instances" {
  description = "Maximum server instances"
  type        = number
  default     = 10
}

variable "worker_min_instances" {
  description = "Minimum worker instances (always-on for queues)"
  type        = number
  default     = 1
}

variable "worker_max_instances" {
  description = "Maximum worker instances"
  type        = number
  default     = 5
}

variable "web_min_instances" {
  description = "Minimum web instances"
  type        = number
  default     = 0 # Scale to zero when idle
}

variable "web_max_instances" {
  description = "Maximum web instances"
  type        = number
  default     = 10
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


variable "server_domain" {
  description = "Custom domain for server (e.g., api.openplane.tech)"
  type        = string
  default     = ""
}

variable "web_domain" {
  description = "Custom domain for web (e.g., app.openplane.tech)"
  type        = string
  default     = ""
}

variable "cookie_domain" {
  description = "Cookie domain for auth (e.g., .openplane.tech for all subdomains)"
  type        = string
  default     = ""
}

variable "redeploy_id" {
  description = "ID to trigger redeployment"
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

