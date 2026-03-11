variable "resource_group_name" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "a_records" {
  type = map(object({
    name    = string
    ttl     = number
    records = list(string)
  }))
  default = {}
}

variable "cname_records" {
  type = map(object({
    name   = string
    ttl    = number
    record = string
  }))
  default = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
