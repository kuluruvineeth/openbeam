# Redis Metrics for Grafana

## Quick Queries to Add to Dashboard

### Panel 1: Redis Memory Usage

**Query:**
```promql
redis_memory_used_bytes / 1024 / 1024
```

**Panel Type:** Stat  
**Unit:** MB  
**Title:** Redis Memory Usage

---

### Panel 2: Connected Clients

**Query:**
```promql
redis_connected_clients
```

**Panel Type:** Stat  
**Unit:** none  
**Title:** Redis Connected Clients

---

### Panel 3: Commands Per Second

**Query:**
```promql
rate(redis_commands_processed_total[5m])
```

**Panel Type:** Graph  
**Unit:** ops/s  
**Title:** Redis Command Rate

---

### Panel 4: Redis Keys by Database

**Query:**
```promql
redis_db_keys
```

**Panel Type:** Bar gauge  
**Unit:** none  
**Title:** Keys by Database

---

### Panel 5: Redis Memory Usage %

**Query:**
```promql
(redis_memory_used_bytes / redis_memory_max_bytes) * 100
```

**Panel Type:** Gauge  
**Unit:** percent (0-100)  
**Title:** Memory Usage %  
**Note:** Only works if maxmemory is set in Redis config

---

### Panel 6: Keyspace Hit Rate

**Query:**
```promql
rate(redis_keyspace_hits_total[5m]) / 
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100
```

**Panel Type:** Gauge  
**Unit:** percent (0-100)  
**Title:** Cache Hit Rate

---

### Panel 7: Network I/O

**Query for Input:**
```promql
rate(redis_net_input_bytes_total[5m]) / 1024
```

**Query for Output:**
```promql
rate(redis_net_output_bytes_total[5m]) / 1024
```

**Panel Type:** Graph  
**Unit:** KB/s  
**Title:** Redis Network I/O

---

### Panel 8: Blocked Clients

**Query:**
```promql
redis_blocked_clients
```

**Panel Type:** Stat  
**Unit:** none  
**Title:** Blocked Clients

---

## How to Add Panels

1. Go to **OpenPlane Command Center** dashboard
2. Click **⚙️ Settings** (top right)
3. Click **Variables** (if needed)
4. Go back and click **Add** > **Visualization**
5. Select **Prometheus** as data source
6. Enter one of the queries above
7. Configure panel type and unit
8. Click **Apply**
9. **Save dashboard** (disk icon, top right)

---

## All Available Redis Metrics

To see ALL Redis metrics in Prometheus:

```promql
{__name__=~"redis_.*"}
```

Or in terminal:
```bash
curl -s 'http://localhost:9090/api/v1/label/__name__/values' | \
  jq -r '.data[] | select(startswith("redis_"))'
```

---

## Current Values (as of test)

- `redis_memory_used_bytes`: 4 MB
- `redis_connected_clients`: 1
- `redis_commands_processed_total`: 3.4M
- `redis_db_keys`: Check in Grafana

---

## Testing in Prometheus

Visit: http://localhost:9090

Try these queries to verify data:

```promql
# Memory trend
redis_memory_used_bytes[5m]

# Command rate
rate(redis_commands_processed_total[1m])

# All metrics
{job="redis-exporter"}
```

