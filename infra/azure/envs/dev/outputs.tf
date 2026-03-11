output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "aks_cluster_name" {
  value = module.aks.cluster_name
}

output "acr_login_server" {
  value = module.storage.acr_login_server
}

output "key_vault_uri" {
  value = module.security.key_vault_uri
}

output "kube_config" {
  value     = module.aks.kube_config
  sensitive = true
}

output "identity_client_ids" {
  value = module.security.identity_client_ids
}

output "db_admin_password" {
  value     = random_password.db_admin.result
  sensitive = true
}
