#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# SkySpot — Azure Container Apps deployment (single container)
# Uses GitHub Container Registry (ghcr.io) to avoid ACR costs
# ============================================================================

SUBSCRIPTION="461cb9e6-36b7-4bb1-8a95-acd02f19390f"
RESOURCE_GROUP="LiamResG-ne"
LOCATION="northeurope"
ENV_NAME="liamapp-env"
APP_NAME="skyspot"

GHCR_USER="${GHCR_USER:?Set GHCR_USER to your GitHub username}"
GHCR_TOKEN="${GHCR_TOKEN:?Set GHCR_TOKEN to a GitHub PAT with write:packages scope}"
REGISTRY="ghcr.io/${GHCR_USER}"
IMAGE="${REGISTRY}/skyspot:latest"

# --- Azure subscription -----------------------------------------------------
echo "→ Setting subscription..."
az account set --subscription "$SUBSCRIPTION"

# --- Build & push image to GHCR --------------------------------------------
echo "→ Logging in to GitHub Container Registry..."
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

echo "→ Building and pushing image..."
docker build -t "$IMAGE" .
docker push "$IMAGE"

# --- Container Apps environment ---------------------------------------------
echo "→ Creating Container Apps environment..."
az containerapp env create \
  --name "$ENV_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  2>/dev/null || echo "  (environment already exists)"

# --- Deploy app -------------------------------------------------------------
echo "→ Deploying container app..."
az containerapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENV_NAME" \
  --image "$IMAGE" \
  --registry-server ghcr.io \
  --registry-username "$GHCR_USER" \
  --registry-password "$GHCR_TOKEN" \
  --target-port 80 \
  --ingress external \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 0 \
  --max-replicas 1 \
  --secrets "database-url=not-configured-yet" \
  --env-vars "DATABASE_URL=secretref:database-url" \
  2>/dev/null || \
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE" \
  --min-replicas 0 \
  --max-replicas 1

# --- Output -----------------------------------------------------------------
FQDN=$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" \
  -o tsv)

echo ""
echo "============================================================================"
echo "  Deployment complete!"
echo "  URL: https://${FQDN}"
echo "  Scales to zero when idle (free tier friendly)."
echo "============================================================================"
