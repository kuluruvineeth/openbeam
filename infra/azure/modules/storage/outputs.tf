output "acr_id" {
  value = azurerm_container_registry.this.id
}

output "acr_login_server" {
  value = azurerm_container_registry.this.login_server
}

output "storage_account_id" {
  value = azurerm_storage_account.this.id
}

output "storage_account_name" {
  value = azurerm_storage_account.this.name
}

output "storage_primary_access_key" {
  value     = azurerm_storage_account.this.primary_access_key
  sensitive = true
}

output "storage_primary_connection_string" {
  value     = azurerm_storage_account.this.primary_connection_string
  sensitive = true
}

output "blob_endpoint" {
  value = azurerm_storage_account.this.primary_blob_endpoint
}
