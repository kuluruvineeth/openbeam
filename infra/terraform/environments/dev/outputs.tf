# ==============================================================================
# Development Environment Outputs
# ==============================================================================

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
  
  ========================================
  OpenPlane Development Environment
  ========================================
  
  🌐 Service URLs:
  ├─ Server: ${module.server.service_url}
  └─ Web:    ${module.web.service_url}
  
  🔍 Internal Services:
  ├─ Worker:   ${module.worker.service_url}
  ├─ Database: ${module.cloud_sql.private_ip_address}:5432 (private)
  │            ${module.cloud_sql.public_ip_address}:5432 (public - dev only)
  ├─ Redis:    ${module.redis.host}:${module.redis.port}
  └─ Vespa:    ${module.vespa.private_ip}:8080
  
  📦 Artifact Registry:
  └─ URL:      ${module.artifact_registry.repository_url}
  
  💡 Cost-Optimized Configuration:
  • Cloud SQL: 1 vCPU, no HA (~$50/month)
  • Redis: BASIC tier (~$25/month)
  • Vespa: Preemptible (~$12/month)
  • Cloud Run: Scale to zero
  
  💵 Estimated Monthly Cost: ~$100
  
  ========================================
  EOT
}
