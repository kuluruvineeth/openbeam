# Networking Module

VPC with Direct VPC Egress for Cloud Run.

## Usage

```hcl
module "networking" {
  source = "../../modules/networking"

  project_name            = "openplane"
  environment             = "prod"
  region                  = "us-central1"
  cloud_run_subnet_cidr   = "10.0.0.0/24"
  compute_subnet_cidr     = "10.0.1.0/24"
  pods_subnet_cidr        = "10.1.0.0/16"
  services_subnet_cidr    = "10.2.0.0/16"
  enable_metrics_scraping = true
}
```
