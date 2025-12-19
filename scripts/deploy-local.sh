#!/bin/bash
set -e

# Local deployment script using GHCR images
# Tests the full production stack locally

echo "🚀 OpenPlane Local Deployment"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="ghcr.io"
ORG="kuluruvineeth"
TAG="${1:-latest}"

echo "Using images from: $REGISTRY/$ORG"
echo "Tag: $TAG"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Pull latest images
echo ""
echo "📦 Pulling images..."
echo ""

services=("server" "web" "docs" "worker")
for service in "${services[@]}"; do
    echo -n "Pulling openplane-$service:$TAG... "
    if docker pull "$REGISTRY/$ORG/openplane-$service:$TAG" 2>&1 | grep -q "Downloaded newer image\|Image is up to date"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Image not found, will build locally${NC}"
    fi
done

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}⚠ No .env file found${NC}"
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo "Please update .env with your configuration"
    else
        echo -e "${RED}✗ No .env.example found${NC}"
        exit 1
    fi
fi

# Start services
echo ""
echo "🔧 Starting services..."
echo ""

docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

sleep 10

# Health checks
echo "🏥 Running health checks..."
echo ""

# Check Postgres
echo -n "Checking Postgres... "
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check Redis
echo -n "Checking Redis... "
if docker-compose exec -T redis redis-cli PING | grep -q "PONG"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check Vespa
echo -n "Checking Vespa... "
if curl -sf http://localhost:8080/state/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Starting (may take 2-3 minutes)${NC}"
fi

# Check Server
echo -n "Checking Server... "
if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Starting${NC}"
fi

# Check Worker metrics
echo -n "Checking Worker... "
if curl -sf http://localhost:9091/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Starting${NC}"
fi

# Check Prometheus
echo -n "Checking Prometheus... "
if curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Starting${NC}"
fi

# Check Grafana
echo -n "Checking Grafana... "
if curl -sf http://localhost:3002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Starting${NC}"
fi

# Check Jaeger
echo -n "Checking Jaeger... "
if curl -sf http://localhost:16686 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Starting${NC}"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service URLs:"
echo "  • Web UI:      http://localhost:3001"
echo "  • API Server:  http://localhost:3000"
echo "  • Docs:        http://localhost:4000"
echo "  • BullBoard:   http://localhost:3000/admin/queues"
echo "  • Grafana:     http://localhost:3002 (admin/admin)"
echo "  • Prometheus:  http://localhost:9090"
echo "  • Jaeger:      http://localhost:16686"
echo ""
echo "📝 Logs:"
echo "  docker-compose logs -f [service]"
echo ""
echo "🛑 Stop:"
echo "  docker-compose down"
echo ""

