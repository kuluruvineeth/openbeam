variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "acr_sku" {
  type    = string
  default = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "acr_sku must be Basic, Standard, or Premium."
  }
}

variable "acr_geo_replications" {
  type = list(object({
    location                = string
    zone_redundancy_enabled = bool
  }))
  default = []
}

variable "storage_replication_type" {
  type    = string
  default = "LRS"
}

variable "private_endpoint_subnet_id" {
  type = string
}

variable "private_dns_zone_id_blob" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
