output "name" {
  description = "Bucket name"
  value       = google_storage_bucket.bucket.name
}

output "bucket_name" {
  description = "Bucket name (alias)"
  value       = google_storage_bucket.bucket.name
}

output "url" {
  description = "Bucket URL"
  value       = google_storage_bucket.bucket.url
}

output "self_link" {
  description = "Bucket self link"
  value       = google_storage_bucket.bucket.self_link
}
