# Cloud SQL Module

PostgreSQL database with automated backups and high availability.

## Usage

```hcl
module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id                = var.project_id
  project_name              = "openplane"
  environment               = "prod"
  region                    = "us-central1"
  network_id                = module.networking.network_id
  private_vpc_connection_id = module.networking.private_vpc_connection_id

  tier                  = "db-custom-2-8192"  # 2 vCPU, 8GB
  high_availability     = true
  disk_size             = 100
  disk_autoresize_limit = 500

  database_name = "openplane"
  database_user = "openplane"
}
```

## Environment Configs

**Dev:**

```hcl
tier               = "db-f1-micro"  # Shared core (~$10/mo)
high_availability  = false
disk_size          = 10
```

**Prod:**

```hcl
tier               = "db-custom-2-8192"  # 2 vCPU, 8GB (~$120/mo)
high_availability  = true
disk_size          = 100
```

## Operations

**Backup:**

```bash
gcloud sql backups create --instance=openplane-db-prod-xxxx
```

**Restore:**

```bash
gcloud sql backups restore BACKUP_ID --backup-instance=openplane-db-prod-xxxx
```
