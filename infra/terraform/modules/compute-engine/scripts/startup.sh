#!/bin/bash
set -e

VESPA_VERSION="${vespa_version}"
DATA_DISK_DEVICE="${data_disk_device}"
DATA_MOUNT_POINT="${data_mount_point}"

# Update system
apt-get update -qq && apt-get upgrade -y -qq

# Mount data disk
mkdir -p "$DATA_MOUNT_POINT"
if ! blkid "$DATA_DISK_DEVICE" | grep -q ext4; then
    mkfs.ext4 -F "$DATA_DISK_DEVICE"
fi
if ! mount | grep -q "$DATA_MOUNT_POINT"; then
    mount "$DATA_DISK_DEVICE" "$DATA_MOUNT_POINT"
    echo "$DATA_DISK_DEVICE $DATA_MOUNT_POINT ext4 defaults,nofail 0 2" >> /etc/fstab
fi

# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

# Setup Vespa directories
mkdir -p "$DATA_MOUNT_POINT"/{vespa-config,vespa-data,vespa-logs}
chown -R 1000:1000 "$DATA_MOUNT_POINT"/vespa-*

# Pull Vespa image
docker pull vespaengine/vespa:$VESPA_VERSION

# Create systemd service
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

# Start Vespa
systemctl daemon-reload
systemctl enable --now vespa

# Wait for health
for i in {1..36}; do
    if curl -sf http://localhost:19071/state/v1/health &>/dev/null; then
        echo "Vespa ready"
        break
    fi
    [ $i -eq 36 ] && echo "Vespa startup timeout" && exit 1
    sleep 5
done

# Install monitoring
apt-get install -y -qq prometheus-node-exporter
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install 2>/dev/null
rm -f add-google-cloud-ops-agent-repo.sh

