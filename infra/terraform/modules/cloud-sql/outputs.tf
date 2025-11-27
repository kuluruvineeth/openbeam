output "instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.postgres.name
}

output "instance_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "private_ip_address" {
  description = "Private IP address of Cloud SQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "public_ip_address" {
  description = "Public IP address of Cloud SQL instance (if enabled)"
  value       = var.enable_public_ip ? google_sql_database_instance.postgres.public_ip_address : null
}

output "database_name" {
  description = "Database name"
  value       = google_sql_database.openplane.name
}

output "database_user" {
  description = "Database user name"
  value       = google_sql_user.openplane.name
}

output "database_password_secret_id" {
  description = "Secret Manager secret ID for database password"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "connection_string_secret_id" {
  description = "Secret Manager secret ID for database connection string"
  value       = google_secret_manager_secret.db_connection_string.secret_id
}

output "connection_string" {
  description = "Database connection string (sensitive)"
  value       = "postgresql://${google_sql_user.openplane.name}:${urlencode(var.database_password != "" ? var.database_password : random_password.db_password.result)}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.openplane.name}?sslmode=require"
  sensitive   = true
}

