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

variable "sku_name" {
  type    = string
  default = "Standard"

  validation {
    condition     = contains(["Standard", "Premium"], var.sku_name)
    error_message = "sku_name must be Standard or Premium."
  }
}

variable "family" {
  type    = string
  default = "C"

  validation {
    condition     = contains(["C", "P"], var.family)
    error_message = "family must be C or P."
  }
}

variable "capacity" {
  type    = number
  default = 1

  validation {
    condition     = var.capacity >= 0 && var.capacity <= 6
    error_message = "capacity must be between 0 and 6."
  }
}

variable "subnet_id" {
  type    = string
  default = null
}

variable "private_endpoint_subnet_id" {
  type = string
}

variable "private_dns_zone_id" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
