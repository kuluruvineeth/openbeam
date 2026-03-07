# Redis Module (Memorystore)

Managed Redis for BullMQ job queues and application caching.

## Usage

```hcl
module "redis" {
  source = "../../modules/redis"

  project_id   = var.project_id
  project_name = "openbeam"
  environment  = "prod"
  region       = "us-central1"
  network_id   = module.networking.network_id

  tier           = "STANDARD_HA"
  memory_size_gb = 5
  replica_count  = 1
  auth_enabled   = true

  persistence_mode    = "RDB"
  rdb_snapshot_period = "TWELVE_HOURS"
}
```

## Environment Configs

**Dev:**

```hcl
tier           = "BASIC"  # No HA (~$25/mo)
memory_size_gb = 1
auth_enabled   = false
persistence_mode = "DISABLED"
```

**Prod:**

```hcl
tier           = "STANDARD_HA"  # High availability (~$200/mo)
memory_size_gb = 5
replica_count  = 1
auth_enabled   = true
persistence_mode = "RDB"
```

## Tier Comparison

| Feature          | BASIC      | STANDARD_HA |
| ---------------- | ---------- | ----------- |
| **Availability** | 99.9%      | 99.95%      |
| **Failover**     | Manual     | Automatic   |
| **Persistence**  | No         | Yes         |
| **Cost**         | ~$25/GB/mo | ~$40/GB/mo  |
