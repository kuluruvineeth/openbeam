# Compute Engine Module (Vespa)

VM running Vespa search engine with automated setup and backups.

## Usage

```hcl
module "vespa" {
  source = "../../modules/compute-engine"

  project_id    = var.project_id
  project_name  = "openbeam"
  environment   = "prod"
  region        = "us-central1"
  zone          = "us-central1-a"
  network_id    = module.networking.network_id
  network_name  = module.networking.network_name
  subnetwork_id = module.networking.compute_subnet_id

  machine_type  = "n2-standard-4"  # 4 vCPU, 16GB
  preemptible   = false

  boot_disk_size = 50
  data_disk_size = 200
  data_disk_type = "pd-ssd"

  vespa_version = "8.613.57"

  enable_snapshot_schedule = true
  allowed_source_ranges    = ["10.0.0.0/24"]  # Cloud Run subnet

  service_account_email = google_service_account.vespa.email
}
```

## Environment Configs

**Dev:**

```hcl
machine_type  = "n2-standard-2"  # 2 vCPU, 8GB (~$20/mo)
preemptible   = true             # 80% cheaper
data_disk_size = 50
data_disk_type = "pd-balanced"
```

**Prod:**

```hcl
machine_type  = "n2-standard-4"  # 4 vCPU, 16GB (~$150/mo)
preemptible   = false
data_disk_size = 200
data_disk_type = "pd-ssd"
```

## Operations

**SSH Access:**

```bash
gcloud compute ssh openbeam-vespa-prod --zone=us-central1-a --tunnel-through-iap
```

**Deploy Schema:**

```bash
cd packages/vespa
./deploy.sh <vespa-private-ip>
```

**Check Health:**

```bash
curl http://<vespa-ip>:8080/state/v1/health
```
