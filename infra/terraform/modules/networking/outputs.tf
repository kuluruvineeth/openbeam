output "network_id" {
  description = "VPC network ID"
  value       = google_compute_network.vpc.id
}

output "network_name" {
  description = "VPC network name"
  value       = google_compute_network.vpc.name
}

output "network_self_link" {
  description = "VPC network self link"
  value       = google_compute_network.vpc.self_link
}

output "cloud_run_subnet_id" {
  description = "Cloud Run subnet ID"
  value       = google_compute_subnetwork.cloud_run.id
}

output "cloud_run_subnet_name" {
  description = "Cloud Run subnet name"
  value       = google_compute_subnetwork.cloud_run.name
}

output "compute_subnet_id" {
  description = "Compute Engine subnet ID"
  value       = google_compute_subnetwork.compute.id
}

output "compute_subnet_name" {
  description = "Compute Engine subnet name"
  value       = google_compute_subnetwork.compute.name
}

output "private_vpc_connection_id" {
  description = "Private VPC connection ID for Cloud SQL and Redis"
  value       = google_service_networking_connection.private_vpc_connection.network
}

output "router_id" {
  description = "Cloud Router ID"
  value       = google_compute_router.router.id
}

output "nat_id" {
  description = "Cloud NAT ID"
  value       = google_compute_router_nat.nat.id
}

