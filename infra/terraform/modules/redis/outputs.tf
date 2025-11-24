output "instance_id" {
  description = "Redis instance ID"
  value       = google_redis_instance.redis.id
}

output "instance_name" {
  description = "Redis instance name"
  value       = google_redis_instance.redis.name
}

output "host" {
  description = "Redis host IP address"
  value       = google_redis_instance.redis.host
}

output "port" {
  description = "Redis port"
  value       = google_redis_instance.redis.port
}

output "current_location_id" {
  description = "Current location of Redis instance"
  value       = google_redis_instance.redis.current_location_id
}

output "redis_url_secret_id" {
  description = "Secret Manager secret ID for Redis URL"
  value       = google_secret_manager_secret.redis_url.secret_id
}

output "redis_host_secret_id" {
  description = "Secret Manager secret ID for Redis host"
  value       = google_secret_manager_secret.redis_host.secret_id
}

output "redis_port_secret_id" {
  description = "Secret Manager secret ID for Redis port"
  value       = google_secret_manager_secret.redis_port.secret_id
}

output "redis_auth_string_secret_id" {
  description = "Secret Manager secret ID for Redis auth string"
  value       = var.auth_enabled ? google_secret_manager_secret.redis_auth_string[0].secret_id : null
}

output "connection_string" {
  description = "Redis connection string (sensitive)"
  value       = var.auth_enabled ? "redis://:${google_redis_instance.redis.auth_string}@${google_redis_instance.redis.host}:${google_redis_instance.redis.port}" : "redis://${google_redis_instance.redis.host}:${google_redis_instance.redis.port}"
  sensitive   = true
}

