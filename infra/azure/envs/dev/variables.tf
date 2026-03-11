variable "project_name" {
  type    = string
  default = "openbeam"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "location" {
  type    = string
  default = "westus2"
}

variable "domain_name" {
  type    = string
  default = ""
}

variable "tags" {
  type = map(string)
  default = {
    project     = "openbeam"
    environment = "dev"
    managed_by  = "terraform"
  }
}
