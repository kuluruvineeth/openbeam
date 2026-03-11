terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.63"
    }
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "azurerm_redis_cache" "this" {
  name                          = "${local.name_prefix}-redis"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  capacity                      = var.capacity
  family                        = var.family
  sku_name                      = var.sku_name
  non_ssl_port_enabled          = false
  minimum_tls_version           = "1.2"
  redis_version                 = "6"
  public_network_access_enabled = false
  subnet_id                     = var.sku_name == "Premium" ? var.subnet_id : null
  tags                          = var.tags

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  lifecycle {
    prevent_destroy = false
  }
}

resource "azurerm_private_endpoint" "redis" {
  name                = "${local.name_prefix}-redis-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "${local.name_prefix}-redis-psc"
    private_connection_resource_id = azurerm_redis_cache.this.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "redis-dns"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }
}
