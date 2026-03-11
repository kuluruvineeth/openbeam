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

variable "vnet_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "subnet_cidrs" {
  type = map(string)
  default = {
    aks_nodes         = "10.0.0.0/20"
    postgres          = "10.0.16.0/24"
    private_endpoints = "10.0.18.0/24"
  }
}

variable "tags" {
  type    = map(string)
  default = {}
}
