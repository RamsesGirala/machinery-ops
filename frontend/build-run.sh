#!/usr/bin/env bash
set -e

IMAGE_NAME="machinery-frontend"
CONTAINER_NAME="machinery-frontend"

echo ">> Construyendo imagen ${IMAGE_NAME}..."
docker build -t "$IMAGE_NAME" .

echo ">> Limpiando imágenes dangling..."
docker image prune -f >/dev/null 2>&1 || true

if docker ps -aq -f "name=^${CONTAINER_NAME}$" >/dev/null; then
  echo ">> Eliminando contenedor previo ${CONTAINER_NAME}..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

echo ">> Levantando contenedor ${CONTAINER_NAME}..."
docker run \
  --name "$CONTAINER_NAME" \
  -p 8001:8001 \
  --rm \
  -v "$(pwd)":/app \
  -v /app/node_modules \
  "$IMAGE_NAME"
