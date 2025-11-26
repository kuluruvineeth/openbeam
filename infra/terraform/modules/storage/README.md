# Storage Module

This module creates a Google Cloud Storage bucket with support for versioning, lifecycle rules, and CORS.

## Usage

```hcl
module "storage" {
  source = "../modules/storage"

  project_id = var.project_id
  name       = "my-app-storage"
  location   = "US"

  versioning_enabled = true

  cors = [{
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }]
}
```
