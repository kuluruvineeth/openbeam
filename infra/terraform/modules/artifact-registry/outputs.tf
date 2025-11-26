output "id" {
  description = "Repository ID"
  value       = google_artifact_registry_repository.repo.id
}

output "name" {
  description = "Repository name"
  value       = google_artifact_registry_repository.repo.name
}

output "location" {
  description = "Repository location"
  value       = google_artifact_registry_repository.repo.location
}

output "repository_url" {
  description = "Repository URL (e.g., us-central1-docker.pkg.dev/project/repo)"
  value       = "${google_artifact_registry_repository.repo.location}-docker.pkg.dev/${google_artifact_registry_repository.repo.project}/${google_artifact_registry_repository.repo.repository_id}"
}
