# ==============================================================================
# Production Environment Outputs
# ==============================================================================

# Networking
output "vpc_network_id" {
  description = "VPC network ID"
  value       = module.networking.network_id
}

output "vpc_network_name" {
  description = "VPC network name"
  value       = module.networking.network_name
}

# Cloud SQL
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

# Redis
output "redis_host" {
  description = "Redis host IP address"
  value       = module.redis.host
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

# Vespa
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

# Cloud Run Services
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

# Service Accounts
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

# ==============================================================================
# Deployment Information
# ==============================================================================

output "deployment_summary" {
  description = "Deployment summary with URLs and commands"
  value = <<-EOT
  
  ========================================
  OpenPlane Production Deployment Summary
  ========================================
  
  🌐 Service URLs:
  ├─ API Server:  ${module.server.service_url}
  ├─ Web App:     ${module.web.service_url}
  └─ Docs:        ${module.docs.service_url}
  
  🔍 Internal Services:
  ├─ Worker:      ${module.worker.service_url}
  ├─ Database:    ${module.cloud_sql.private_ip_address}:5432
  ├─ Redis:       ${module.redis.host}:${module.redis.port}
  └─ Vespa:       ${module.vespa.private_ip}:8080
  
  🔐 SSH Access (Vespa):
  ${module.vespa.ssh_command}
  
  📊 Next Steps:
  1. Update DNS:
     • api.openplane.tech  → ${module.server.service_url}
     • app.openplane.tech  → ${module.web.service_url}
     • docs.openplane.tech → ${module.docs.service_url}
  
  2. Deploy Vespa Application:
     cd packages/vespa
     ./deploy.sh ${module.vespa.private_ip}
  
  3. Run Database Migrations:
     gcloud run services update ${module.server.service_name} \
       --region=${var.region} \
       --command="bun run db:migrate"
  
  4. Verify Health:
     • Server: curl ${module.server.service_url}/
     • Vespa:  ${module.vespa.ssh_command}
               curl http://localhost:8080/state/v1/health
  
  ========================================
  EOT
}

