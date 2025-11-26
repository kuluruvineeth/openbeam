variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "location" {
  description = "Region for the repository"
  type        = string
  default     = "us-central1"
}

variable "repository_id" {
  description = "ID of the repository"
  type        = string
}

variable "description" {
  description = "Description of the repository"
  type        = string
  default     = "Docker repository"
}

variable "format" {
  description = "Format of the repository (DOCKER, MAVEN, NPM, etc.)"
  type        = string
  default     = "DOCKER"
}

variable "labels" {
  description = "Labels to apply to the repository"
  type        = map(string)
  default     = {}
}
