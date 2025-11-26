output "service_id" {
  description = "Cloud Run service ID"
  value       = google_cloud_run_v2_service.service.id
}

output "service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.service.name
}

output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.service.uri
}

output "service_location" {
  description = "Cloud Run service location"
  value       = google_cloud_run_v2_service.service.location
}

output "service_status" {
  description = "Cloud Run service status"
  value       = google_cloud_run_v2_service.service.terminal_condition
}

