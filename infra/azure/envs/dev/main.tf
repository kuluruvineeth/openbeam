terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.63"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.17"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

data "azurerm_kubernetes_cluster" "main" {
  name                = module.aks.cluster_name
  resource_group_name = azurerm_resource_group.this.name
  depends_on          = [module.aks]
}

provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.main.kube_config[0].host
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate)
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].client_key)
}

provider "helm" {
  kubernetes {
    host                   = data.azurerm_kubernetes_cluster.main.kube_config[0].host
    cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate)
    client_certificate     = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].client_certificate)
    client_key             = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].client_key)
  }
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "this" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location
  tags     = var.tags
}

# -----------------------------------------------------------------------------
# Networking
# -----------------------------------------------------------------------------
module "networking" {
  source = "../../modules/networking"

  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  project_name        = var.project_name
  environment         = var.environment
  tags                = var.tags
}

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------
module "monitoring" {
  source = "../../modules/monitoring"

  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  project_name        = var.project_name
  environment         = var.environment
  retention_days      = 30
  tags                = var.tags
}

# -----------------------------------------------------------------------------
# AKS
# -----------------------------------------------------------------------------
module "aks" {
  source = "../../modules/aks"

  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  project_name        = var.project_name
  environment         = var.environment
  vnet_subnet_id      = module.networking.subnet_ids["aks_nodes"]

  default_node_pool = {
    vm_size   = "Standard_D2as_v5"
    min_count = 1
    max_count = 2
    zones     = []
  }

  additional_node_pools = {
    workload = {
      vm_size    = "Standard_D4as_v5"
      min_count  = 1
      max_count  = 2
      node_count = 2
      priority   = "Regular"
      node_labels = {
        "openbeam/pool" = "workload"
      }
      zones = []
    }
    app = {
      vm_size    = "Standard_D4as_v5"
      min_count  = 0
      max_count  = 2
      node_count = 1
      priority   = "Spot"
      node_labels = {
        "openbeam/pool" = "spot"
      }
      zones = []
    }
  }

  log_analytics_workspace_id = module.monitoring.workspace_id
  acr_id                     = module.storage.acr_id
  enable_acr_pull            = true
  tags                       = var.tags

  depends_on = [module.networking]
}

# -----------------------------------------------------------------------------
# Database (PostgreSQL) — deployed in AKS via Helm
# PostgreSQL Flexible Server is subscription-restricted in all regions.
# Using in-cluster PostgreSQL for dev/pilot. For production, request quota
# increase at https://aka.ms/postgres-request-quota-increase
# -----------------------------------------------------------------------------
resource "random_password" "db_admin" {
  length  = 32
  special = false
}

# -----------------------------------------------------------------------------
# Cache (Redis) — deployed in AKS via Helm
# Avoids Azure Redis PaaS cost (~$25/mo) for dev/pilot.
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Storage (ACR + Blob)
# -----------------------------------------------------------------------------
module "storage" {
  source = "../../modules/storage"

  resource_group_name        = azurerm_resource_group.this.name
  location                   = azurerm_resource_group.this.location
  project_name               = var.project_name
  environment                = var.environment
  acr_sku                    = "Basic"
  storage_replication_type   = "LRS"
  private_endpoint_subnet_id = module.networking.subnet_ids["private_endpoints"]
  private_dns_zone_id_blob   = module.networking.private_dns_zone_ids["blob_storage"]
  tags                       = var.tags

  depends_on = [module.networking]
}

# -----------------------------------------------------------------------------
# Security (Key Vault + Workload Identities)
# -----------------------------------------------------------------------------
module "security" {
  source = "../../modules/security"

  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  project_name        = var.project_name
  environment         = var.environment
  tenant_id           = data.azurerm_client_config.current.tenant_id
  aks_oidc_issuer_url = module.aks.oidc_issuer_url
  tags                = var.tags

  workload_identities = {
    app = {
      namespace            = "openbeam"
      service_account_name = "openbeam-app"
    }
    worker = {
      namespace            = "openbeam"
      service_account_name = "openbeam-worker"
    }
    temporal = {
      namespace            = "temporal"
      service_account_name = "temporal-server"
    }
  }

  depends_on = [module.aks]
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-admin-password"
  value        = random_password.db_admin.result
  key_vault_id = module.security.key_vault_id
  depends_on   = [module.security]
}

# -----------------------------------------------------------------------------
# DNS (optional)
# -----------------------------------------------------------------------------
module "dns" {
  count  = var.domain_name != "" ? 1 : 0
  source = "../../modules/dns"

  resource_group_name = azurerm_resource_group.this.name
  domain_name         = var.domain_name
  tags                = var.tags
}
