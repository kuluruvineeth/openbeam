terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.63"
    }
  }
}

locals {
  server_name = "${var.project_name}-${var.environment}-pgflex"
  merged_tags = merge(var.tags, {
    environment = var.environment
    module      = "database"
  })
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                = local.server_name
  resource_group_name = var.resource_group_name
  location            = var.location
  version             = "16"

  sku_name   = var.sku_name
  storage_mb = var.storage_mb
  zone       = var.zone

  administrator_login    = var.admin_username
  administrator_password = var.admin_password

  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup_enabled

  delegated_subnet_id           = var.delegated_subnet_id
  private_dns_zone_id           = var.private_dns_zone_id
  public_network_access_enabled = var.delegated_subnet_id != null ? false : true

  dynamic "high_availability" {
    for_each = var.ha_mode != "disabled" ? [var.ha_mode] : []
    content {
      mode = high_availability.value
    }
  }

  tags = local.merged_tags

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      zone,
      high_availability[0].standby_availability_zone,
    ]
  }
}

resource "azurerm_postgresql_flexible_server_database" "openbeam" {
  name      = "openbeam"
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  server_id = azurerm_postgresql_flexible_server.this.id
  name      = "azure.extensions"
  value     = "VECTOR,PG_TRGM"
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_preload_libraries" {
  server_id = azurerm_postgresql_flexible_server.this.id
  name      = "shared_preload_libraries"
  value     = "pg_stat_statements"
}
