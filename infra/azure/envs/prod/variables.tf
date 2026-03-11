variable "location" {
  type    = string
  default = "eastus2"
}

variable "project_name" {
  type    = string
  default = "openbeam"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "db_admin_password" {
  type      = string
  sensitive = true
}

variable "tenant_id" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "acr_geo_replications" {
  type = list(object({
    location                = string
    zone_redundancy_enabled = bool
  }))
  default = []
}

variable "tags" {
  type = map(string)
  default = {
    project     = "openbeam"
    environment = "prod"
    managed_by  = "terraform"
  }
}
