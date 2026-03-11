output "key_vault_id" {
  value = azurerm_key_vault.this.id
}

output "key_vault_uri" {
  value = azurerm_key_vault.this.vault_uri
}

output "identity_ids" {
  value = { for k, v in azurerm_user_assigned_identity.workload : k => v.id }
}

output "identity_client_ids" {
  value = { for k, v in azurerm_user_assigned_identity.workload : k => v.client_id }
}

output "identity_principal_ids" {
  value = { for k, v in azurerm_user_assigned_identity.workload : k => v.principal_id }
}
