terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.63"
    }
  }
}

provider "azurerm" {
  features {}
}

locals {
  merged_tags = merge(var.tags, {
    managed_by = "terraform"
    purpose    = "tfstate"
  })
}

resource "azurerm_resource_group" "tfstate" {
  name     = "rg-openbeam-tfstate"
  location = var.location
  tags     = local.merged_tags
}

resource "azurerm_storage_account" "tfstate" {
  name                            = "openbeamtfstate"
  resource_group_name             = azurerm_resource_group.tfstate.name
  location                        = azurerm_resource_group.tfstate.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  tags                            = local.merged_tags

  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 30
    }
  }
}

resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.tfstate.id
  container_access_type = "private"
}
