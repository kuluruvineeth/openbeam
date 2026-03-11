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

variable "kubernetes_version" {
  type    = string
  default = null
}

variable "sku_tier" {
  type    = string
  default = "Free"

  validation {
    condition     = contains(["Free", "Standard", "Premium"], var.sku_tier)
    error_message = "sku_tier must be Free, Standard, or Premium."
  }
}

variable "auto_upgrade_channel" {
  type    = string
  default = "stable"

  validation {
    condition     = contains(["none", "patch", "rapid", "stable", "node-image"], var.auto_upgrade_channel)
    error_message = "auto_upgrade_channel must be none, patch, rapid, stable, or node-image."
  }
}

variable "vnet_subnet_id" {
  type = string
}

variable "pod_cidr" {
  type    = string
  default = "192.168.0.0/16"
}

variable "service_cidr" {
  type    = string
  default = "172.16.0.0/16"
}

variable "dns_service_ip" {
  type    = string
  default = "172.16.0.10"
}

variable "default_node_pool" {
  type = object({
    vm_size         = optional(string, "Standard_D2as_v5")
    min_count       = optional(number, 2)
    max_count       = optional(number, 5)
    node_count      = optional(number, 2)
    os_disk_size_gb = optional(number, 128)
    zones           = optional(list(string), ["1", "2", "3"])
  })
  default = {}
}

variable "additional_node_pools" {
  type = map(object({
    vm_size         = string
    min_count       = number
    max_count       = number
    node_count      = number
    priority        = optional(string, "Regular")
    eviction_policy = optional(string, "Delete")
    node_labels     = optional(map(string), {})
    node_taints     = optional(list(string), [])
    os_disk_size_gb = optional(number, 128)
    zones           = optional(list(string), ["1", "2", "3"])
  }))
  default = {}
}

variable "log_analytics_workspace_id" {
  type    = string
  default = null
}

variable "acr_id" {
  type    = string
  default = null
}

variable "enable_acr_pull" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
