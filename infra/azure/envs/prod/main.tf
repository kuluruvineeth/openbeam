terraform {
  required_version = ">= 1.5"

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
  features {}
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

data "azurerm_kubernetes_cluster" "main" {
  name                = module.aks.cluster_name
  resource_group_name = azurerm_resource_group.this.name
  depends_on          = [module.aks]
}

resource "azurerm_resource_group" "this" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location
  tags     = var.tags
}

module "networking" {
  source = "../../modules/networking"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  project_name        = var.project_name
  environment         = var.environment
  tags                = var.tags
}

module "monitoring" {
  source = "../../modules/monitoring"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  project_name        = var.project_name
  environment         = var.environment
  retention_days      = 90
  tags                = var.tags
}

module "aks" {
  source = "../../modules/aks"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  project_name        = var.project_name
  environment         = var.environment
  sku_tier            = "Standard"
  vnet_subnet_id      = module.networking.subnet_ids["aks_nodes"]
  acr_id              = module.storage.acr_id
  enable_acr_pull     = true

  default_node_pool = {
    vm_size   = "Standard_D2as_v5"
    min_count = 3
    max_count = 5
    zones     = ["1", "2", "3"]
  }

  additional_node_pools = {
    app = {
      vm_size    = "Standard_D8as_v5"
      min_count  = 3
      max_count  = 10
      node_count = 3
      priority   = "Regular"
      zones      = ["1", "2", "3"]
    }
    search = {
      vm_size     = "Standard_E8as_v5"
      min_count   = 2
      max_count   = 4
      node_count  = 2
      priority    = "Regular"
      node_labels = { workload = "search" }
      node_taints = ["workload=search:NoSchedule"]
      zones       = ["1", "2", "3"]
    }
    gpu = {
      vm_size         = "Standard_NC4as_T4_v3"
      min_count       = 0
      max_count       = 4
      node_count      = 0
      priority        = "Spot"
      eviction_policy = "Delete"
      node_labels     = { workload = "gpu" }
      node_taints     = ["workload=gpu:NoSchedule"]
      zones           = []
    }
  }

  log_analytics_workspace_id = module.monitoring.workspace_id
  tags                       = var.tags
}

module "database" {
  source = "../../modules/database"

  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  project_name                 = var.project_name
  environment                  = var.environment
  sku_name                     = "GP_Standard_D4ds_v5"
  storage_mb                   = 65536
  backup_retention_days        = 35
  geo_redundant_backup_enabled = true
  ha_mode                      = "ZoneRedundant"
  delegated_subnet_id          = module.networking.subnet_ids["postgres"]
  private_dns_zone_id          = module.networking.private_dns_zone_ids["postgres"]
  admin_password               = var.db_admin_password
  tags                         = var.tags
}

module "cache" {
  source = "../../modules/cache"

  resource_group_name        = azurerm_resource_group.this.name
  location                   = var.location
  project_name               = var.project_name
  environment                = var.environment
  sku_name                   = "Premium"
  family                     = "P"
  capacity                   = 1
  private_endpoint_subnet_id = module.networking.subnet_ids["private_endpoints"]
  private_dns_zone_id        = module.networking.private_dns_zone_ids["redis"]
  tags                       = var.tags
}

module "storage" {
  source = "../../modules/storage"

  resource_group_name        = azurerm_resource_group.this.name
  location                   = var.location
  project_name               = var.project_name
  environment                = var.environment
  acr_sku                    = "Premium"
  acr_geo_replications       = var.acr_geo_replications
  storage_replication_type   = "GRS"
  private_endpoint_subnet_id = module.networking.subnet_ids["private_endpoints"]
  private_dns_zone_id_blob   = module.networking.private_dns_zone_ids["blob_storage"]
  tags                       = var.tags
}

module "dns" {
  source = "../../modules/dns"

  resource_group_name = azurerm_resource_group.this.name
  domain_name         = var.domain_name
  tags                = var.tags
}

module "security" {
  source = "../../modules/security"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  project_name        = var.project_name
  environment         = var.environment
  tenant_id           = var.tenant_id
  aks_oidc_issuer_url = module.aks.oidc_issuer_url

  workload_identities = {
    server = {
      namespace            = "openbeam"
      service_account_name = "openbeam-server"
    }
    worker = {
      namespace            = "openbeam"
      service_account_name = "openbeam-worker"
    }
    engine = {
      namespace            = "openbeam"
      service_account_name = "openbeam-engine"
    }
  }

  tags = var.tags
}
