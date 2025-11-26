# Artifact Registry Module

This module creates a Google Artifact Registry repository.

## Usage

```hcl
module "artifact_registry" {
  source = "../modules/artifact-registry"

  project_id    = var.project_id
  location      = "us-central1"
  repository_id = "my-repo"
  format        = "DOCKER"
}
```
