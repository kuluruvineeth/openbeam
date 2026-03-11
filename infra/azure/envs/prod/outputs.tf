output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  value = module.aks.cluster_name
}

output "aks_oidc_issuer_url" {
  value = module.aks.oidc_issuer_url
}

output "database_fqdn" {
  value = module.database.server_fqdn
}

output "database_connection_string" {
  value     = module.database.connection_string
  sensitive = true
}

output "redis_hostname" {
  value = module.cache.hostname
}

output "redis_connection_string" {
  value     = module.cache.connection_string
  sensitive = true
}

output "acr_login_server" {
  value = module.storage.acr_login_server
}

output "storage_account_name" {
  value = module.storage.storage_account_name
}

output "blob_endpoint" {
  value = module.storage.blob_endpoint
}

output "key_vault_uri" {
  value = module.security.key_vault_uri
}

output "dns_zone_name_servers" {
  value = module.dns.dns_zone_name_servers
}

output "workload_identity_client_ids" {
  value = module.security.identity_client_ids
}

output "log_analytics_workspace_name" {
  value = module.monitoring.workspace_name
}
