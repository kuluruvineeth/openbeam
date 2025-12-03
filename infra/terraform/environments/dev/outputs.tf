
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

output "vespa_private_ip" {
  description = "Vespa private IP address"
  value       = module.vespa.private_ip
}

output "vespa_ssh_command" {
  description = "SSH command to access Vespa VM"
  value       = module.vespa.ssh_command
}

output "artifact_registry_repository_url" {
  description = "The URL of the Artifact Registry repository"
  value       = module.artifact_registry.repository_url
}

output "cloud_sql_public_ip" {
  description = "Cloud SQL public IP address (dev only)"
  value       = module.cloud_sql.public_ip_address
}

output "cloud_sql_private_ip" {
  description = "Cloud SQL private IP address"
  value       = module.cloud_sql.private_ip_address
}

output "deployment_summary" {
  description = "Deployment summary with URLs"
  value = <<-EOT
  
  Service URLs:
   1. Server: ${module.server.service_url}
   2. Web:    ${module.web.service_url}
  
  Internal Services:
   1. Worker:   ${module.worker.service_url}
   2. Database: ${module.cloud_sql.private_ip_address}:5432 (private)
   3. Redis:    ${module.redis.host}:${module.redis.port}
   4. Vespa:    ${module.vespa.private_ip}:8080
  
  Artifact Registry:
   1. URL:      ${module.artifact_registry.repository_url}

  EOT
}
