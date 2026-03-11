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

variable "tenant_id" {
  type = string
}

variable "aks_oidc_issuer_url" {
  type = string
}

variable "workload_identities" {
  type = map(object({
    namespace            = string
    service_account_name = string
  }))
}

variable "allowed_ip_ranges" {
  type    = list(string)
  default = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
