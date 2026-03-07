CLUSTER_NAME := openbeam-dev
NAMESPACE := openbeam

.PHONY: cluster-up cluster-down dev dev-full dev-voice dev-all clean status logs db-shell redis-shell

cluster-up:
	@kind get clusters 2>/dev/null | grep -q $(CLUSTER_NAME) || \
		kind create cluster --config kind-config.yaml
	@kubectl cluster-info --context kind-$(CLUSTER_NAME)

cluster-down:
	kind delete cluster --name $(CLUSTER_NAME)

dev: cluster-up
	tilt up

dev-full: cluster-up
	tilt up -- --monitoring

dev-voice: cluster-up
	tilt up -- --voice

dev-all: cluster-up
	tilt up -- --monitoring --voice

clean: cluster-down
	@echo "Cluster and all data removed"

status:
	kubectl get pods -n $(NAMESPACE) -o wide

logs:
	@echo "Usage: make logs-<service>"
	@echo "  make logs-server"
	@echo "  make logs-web"
	@echo "  make logs-worker"
	@echo "  make logs-engine"
	@echo "  make logs-sandbox"

logs-server:
	kubectl logs -n $(NAMESPACE) -l app=server -f --tail=100

logs-web:
	kubectl logs -n $(NAMESPACE) -l app=web -f --tail=100

logs-worker:
	kubectl logs -n $(NAMESPACE) -l app=worker -f --tail=100

logs-engine:
	kubectl logs -n $(NAMESPACE) -l app=engine-cpu -f --tail=100

logs-sandbox:
	kubectl logs -n $(NAMESPACE) -l app=sandbox-gateway -f --tail=100

logs-temporal:
	kubectl logs -n $(NAMESPACE) -l app=temporal -f --tail=100

db-shell:
	kubectl exec -n $(NAMESPACE) -it deploy/postgres -- psql -U postgres openbeam

redis-shell:
	kubectl exec -n $(NAMESPACE) -it deploy/redis -- redis-cli

sandbox-test:
	@echo "Testing sandbox gateway..."
	@curl -sf http://localhost:3800/health | jq . || echo "Sandbox gateway not reachable"
