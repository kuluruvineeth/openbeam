output "instance_id" {
  description = "Compute Engine instance ID"
  value       = google_compute_instance.vespa.id
}

output "instance_name" {
  description = "Compute Engine instance name"
  value       = google_compute_instance.vespa.name
}

output "instance_zone" {
  description = "Compute Engine instance zone"
  value       = google_compute_instance.vespa.zone
}

output "private_ip" {
  description = "Private IP address of the instance"
  value       = google_compute_instance.vespa.network_interface[0].network_ip
}

output "data_disk_id" {
  description = "Data disk ID"
  value       = google_compute_disk.vespa_data.id
}

output "vespa_query_url" {
  description = "Vespa query endpoint URL (internal)"
  value       = "http://${google_compute_instance.vespa.network_interface[0].network_ip}:8080"
}

output "vespa_feed_url" {
  description = "Vespa feed endpoint URL (internal)"
  value       = "http://${google_compute_instance.vespa.network_interface[0].network_ip}:8080"
}

output "vespa_config_url" {
  description = "Vespa config endpoint URL (internal)"
  value       = "http://${google_compute_instance.vespa.network_interface[0].network_ip}:19071"
}

output "ssh_command" {
  description = "SSH command to connect via IAP"
  value       = "gcloud compute ssh ${google_compute_instance.vespa.name} --zone=${google_compute_instance.vespa.zone} --tunnel-through-iap"
}

