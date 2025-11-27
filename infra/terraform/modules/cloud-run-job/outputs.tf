output "job_name" {
  description = "The name of the Cloud Run Job"
  value       = google_cloud_run_v2_job.job.name
}

output "job_id" {
  description = "The full resource ID of the job"
  value       = google_cloud_run_v2_job.job.id
}
