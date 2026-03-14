terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.63"
    }
  }
}

data "azurerm_client_config" "current" {}

locals {
  cluster_name = "${var.project_name}-${var.environment}-aks"
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = local.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version
  sku_tier            = var.sku_tier

  automatic_upgrade_channel = var.auto_upgrade_channel
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  azure_active_directory_role_based_access_control {
    azure_rbac_enabled = true
    tenant_id          = data.azurerm_client_config.current.tenant_id
  }

  identity {
    type = "SystemAssigned"
  }

  default_node_pool {
    name                 = "system"
    vm_size              = var.default_node_pool.vm_size
    vnet_subnet_id       = var.vnet_subnet_id
    min_count            = var.default_node_pool.min_count
    max_count            = var.default_node_pool.max_count
    auto_scaling_enabled = true
    os_disk_size_gb      = var.default_node_pool.os_disk_size_gb
    zones                = var.default_node_pool.zones
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    pod_cidr            = var.pod_cidr
    service_cidr        = var.service_cidr
    dns_service_ip      = var.dns_service_ip
  }

  dynamic "oms_agent" {
    for_each = var.log_analytics_workspace_id != null ? [1] : []
    content {
      log_analytics_workspace_id = var.log_analytics_workspace_id
    }
  }

  tags = var.tags
}

resource "azurerm_kubernetes_cluster_node_pool" "additional" {
  for_each = var.additional_node_pools

  name                        = each.key
  kubernetes_cluster_id       = azurerm_kubernetes_cluster.main.id
  vm_size                     = each.value.vm_size
  vnet_subnet_id              = var.vnet_subnet_id
  min_count                   = each.value.min_count
  max_count                   = each.value.max_count
  auto_scaling_enabled        = true
  priority                    = each.value.priority
  eviction_policy             = each.value.priority == "Spot" ? each.value.eviction_policy : null
  node_labels                 = each.value.node_labels
  node_taints                 = each.value.node_taints
  os_disk_size_gb             = each.value.os_disk_size_gb
  zones                       = each.value.zones
  temporary_name_for_rotation = "${each.key}tmp"

  tags = var.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  count                = var.enable_acr_pull ? 1 : 0
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name = "AcrPull"
  scope                = var.acr_id
}

resource "azurerm_role_assignment" "network_contributor" {
  principal_id         = azurerm_kubernetes_cluster.main.identity[0].principal_id
  role_definition_name = "Network Contributor"
  scope                = azurerm_kubernetes_cluster.main.node_resource_group_id
}
