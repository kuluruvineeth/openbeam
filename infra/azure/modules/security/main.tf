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

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "this" {
  name                       = "${local.name_prefix}-kv"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
  tags                       = var.tags

  network_acls {
    bypass         = "AzureServices"
    default_action = "Allow"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_user_assigned_identity" "workload" {
  for_each = var.workload_identities

  name                = "${local.name_prefix}-${each.key}-id"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_federated_identity_credential" "workload" {
  for_each = var.workload_identities

  name      = "${local.name_prefix}-${each.key}-fic"
  parent_id = azurerm_user_assigned_identity.workload[each.key].id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = var.aks_oidc_issuer_url
  subject             = "system:serviceaccount:${each.value.namespace}:${each.value.service_account_name}"
}

resource "azurerm_role_assignment" "kv_secrets_user" {
  for_each = var.workload_identities

  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.workload[each.key].principal_id
}
