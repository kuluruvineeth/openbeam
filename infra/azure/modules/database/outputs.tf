output "server_id" {
  description = "PostgreSQL Flexible Server resource ID"
  value       = azurerm_postgresql_flexible_server.this.id
}

output "server_fqdn" {
  description = "Fully qualified domain name of the server"
  value       = azurerm_postgresql_flexible_server.this.fqdn
}

output "database_name" {
  description = "Name of the application database"
  value       = azurerm_postgresql_flexible_server_database.openbeam.name
}

output "connection_string" {
  description = "PostgreSQL connection string"
  sensitive   = true
  value       = "postgresql://${var.admin_username}:${var.admin_password}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/${azurerm_postgresql_flexible_server_database.openbeam.name}?sslmode=require"
}
