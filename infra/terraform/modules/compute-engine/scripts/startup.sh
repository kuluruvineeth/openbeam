#!/bin/bash
# ==============================================================================
# Vespa Startup Script - Automatic Installation and Configuration
# ==============================================================================
set -e

echo "======================================"
echo "Vespa Installation & Setup"
echo "======================================"

# Variables (passed from Terraform)
VESPA_VERSION="${vespa_version}"
DATA_DISK_DEVICE="${data_disk_device}"
DATA_MOUNT_POINT="${data_mount_point}"

# System Update
echo "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# Mount data disk
echo "Mounting data disk..."
if [ ! -d "$DATA_MOUNT_POINT" ]; then
    mkdir -p "$DATA_MOUNT_POINT"
fi

# Check if disk is already formatted
if ! blkid "$DATA_DISK_DEVICE" | grep -q ext4; then
    echo "Formatting data disk..."
    mkfs.ext4 -F "$DATA_DISK_DEVICE"
fi

# Mount disk
if ! mount | grep -q "$DATA_MOUNT_POINT"; then
    mount "$DATA_DISK_DEVICE" "$DATA_MOUNT_POINT"
    echo "$DATA_DISK_DEVICE $DATA_MOUNT_POINT ext4 defaults,nofail 0 2" >> /etc/fstab
fi

# Install Docker (Vespa runs in Docker)
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    DOCKER_COMPOSE_VERSION="v2.23.0"
    curl -L "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create Vespa directories
echo "Creating Vespa directories..."
mkdir -p "$DATA_MOUNT_POINT/vespa-config"
mkdir -p "$DATA_MOUNT_POINT/vespa-data"
mkdir -p "$DATA_MOUNT_POINT/vespa-logs"

# Pull Vespa Docker image
echo "Pulling Vespa Docker image..."
docker pull vespaengine/vespa:$VESPA_VERSION

# Create Vespa systemd service
echo "Creating Vespa systemd service..."
cat > /etc/systemd/system/vespa.service <<EOF
[Unit]
Description=Vespa Search Engine
Requires=docker.service
After=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
ExecStartPre=-/usr/bin/docker stop vespa
ExecStartPre=-/usr/bin/docker rm vespa
ExecStart=/usr/bin/docker run \\
  --name vespa \\
  --hostname vespa \\
  -p 8080:8080 \\
  -p 19071:19071 \\
  -p 19100:19100 \\
  -v $DATA_MOUNT_POINT/vespa-config:/opt/vespa/conf/vespa \\
  -v $DATA_MOUNT_POINT/vespa-data:/opt/vespa/var \\
  -v $DATA_MOUNT_POINT/vespa-logs:/opt/vespa/logs \\
  vespaengine/vespa:$VESPA_VERSION

ExecStop=/usr/bin/docker stop vespa

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Vespa
echo "Starting Vespa..."
systemctl daemon-reload
systemctl enable vespa
systemctl start vespa

# Wait for Vespa to be ready
echo "Waiting for Vespa to start (this may take 2-3 minutes)..."
timeout=180
counter=0
until curl -s http://localhost:8080/state/v1/health | grep -q "ok"; do
    if [ $counter -ge $timeout ]; then
        echo "ERROR: Vespa failed to start within $timeout seconds"
        exit 1
    fi
    echo "Waiting for Vespa... ($counter/$timeout seconds)"
    sleep 5
    counter=$((counter + 5))
done

echo "✓ Vespa is running!"

# Install monitoring tools
echo "Installing monitoring tools..."
apt-get install -y prometheus-node-exporter

# Configure Stackdriver monitoring agent (optional)
if [ -f /etc/google-cloud-ops-agent/config.yaml ]; then
    echo "Google Cloud Ops Agent already installed"
else
    curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
    bash add-google-cloud-ops-agent-repo.sh --also-install
    rm add-google-cloud-ops-agent-repo.sh
fi

# Create health check script
cat > /usr/local/bin/vespa-health-check.sh <<'EOF'
#!/bin/bash
# Health check script for monitoring
HEALTH_STATUS=$(curl -s http://localhost:8080/state/v1/health | grep -o '"status":"up"' | wc -l)
if [ "$HEALTH_STATUS" -eq 1 ]; then
    echo "Vespa: Healthy"
    exit 0
else
    echo "Vespa: Unhealthy"
    exit 1
fi
EOF

chmod +x /usr/local/bin/vespa-health-check.sh

# Add health check to crontab (runs every minute)
(crontab -l 2>/dev/null; echo "* * * * * /usr/local/bin/vespa-health-check.sh >> /var/log/vespa-health.log 2>&1") | crontab -

echo "======================================"
echo "Vespa installation complete!"
echo "======================================"
echo "Status: systemctl status vespa"
echo "Logs: journalctl -u vespa -f"
echo "Health: curl http://localhost:8080/state/v1/health"
echo "======================================"

