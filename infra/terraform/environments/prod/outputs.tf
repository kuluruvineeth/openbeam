
output "vpc_network_id" {
  description = "VPC network ID"
  value       = module.networking.network_id
}

output "vpc_network_name" {
  description = "VPC network name"
  value       = module.networking.network_name
}

output "database_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.cloud_sql.instance_name
}

output "database_private_ip" {
  description = "Cloud SQL private IP address"
  value       = module.cloud_sql.private_ip_address
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.cloud_sql.instance_connection_name
}

output "redis_host" {
  description = "Redis host IP address"
  value       = module.redis.host
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

output "vespa_private_ip" {
  description = "Vespa private IP address"
  value       = module.vespa.private_ip
}

output "vespa_query_url" {
  description = "Vespa query endpoint URL"
  value       = module.vespa.vespa_query_url
}

output "vespa_ssh_command" {
  description = "SSH command to access Vespa VM"
  value       = module.vespa.ssh_command
}

output "server_url" {
  description = "Server service URL"
  value       = module.server.service_url
}

output "worker_url" {
  description = "Worker service URL (internal)"
  value       = module.worker.service_url
}

output "web_url" {
  description = "Web service URL"
  value       = module.web.service_url
}

output "docs_url" {
  description = "Docs service URL"
  value       = module.docs.service_url
}

output "server_service_account" {
  description = "Server service account email"
  value       = google_service_account.server.email
}

output "worker_service_account" {
  description = "Worker service account email"
  value       = google_service_account.worker.email
}

output "web_service_account" {
  description = "Web service account email"
  value       = google_service_account.web.email
}

output "docs_service_account" {
  description = "Docs service account email"
  value       = google_service_account.docs.email
}

output "vespa_service_account" {
  description = "Vespa service account email"
  value       = google_service_account.vespa.email
}

output "storage_bucket_name" {
  description = "GCS bucket name for file storage"
  value       = module.storage.bucket_name
}

output "storage_bucket_url" {
  description = "GCS bucket URL"
  value       = module.storage.url
}

output "deployment_summary" {
  description = "Deployment summary with URLs and commands"
  value = <<-EOT
  
  Service URLs:
   1. API Server:  ${module.server.service_url}
   2. Web App:     ${module.web.service_url}
   3. Docs:        ${module.docs.service_url}
  
  Internal Services:
   1. Worker:      ${module.worker.service_url}
   2. Database:    ${module.cloud_sql.private_ip_address}:5432
   3. Redis:       ${module.redis.host}:${module.redis.port}
   4. Vespa:       ${module.vespa.private_ip}:8080
  
  SSH Access (Vespa):
  ${module.vespa.ssh_command}
  
  EOT
}

