#!/usr/bin/env bash
set -e

IMAGE_NAME="machinery-ops-backend"
IMAGE_TAG="dev"
CONTAINER_NAME="machinery-ops-backend"

# Ruta al proyecto (carpeta donde está este script)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ruta al archivo de la BD en el host
DB_PATH="${PROJECT_ROOT}/app/db.sqlite3"

echo ">> Proyecto root: ${PROJECT_ROOT}"
echo ">> Usando DB en: ${DB_PATH}"

if [ ! -f "${DB_PATH}" ]; then
  echo ">> No existe db.sqlite3, creando archivo vacío..."
  mkdir -p "$(dirname "${DB_PATH}")"
  touch "${DB_PATH}"
fi

echo ">> (re)construyendo imagen Docker..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" "${PROJECT_ROOT}"

echo ">> Limpiando imágenes dangling..."
docker image prune -f >/dev/null 2>&1 || true

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  echo ">> Eliminando contenedor previo ${CONTAINER_NAME}..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
fi

echo ">> Levantando contenedor ${CONTAINER_NAME}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p 8000:8000 \
  -v "${DB_PATH}:/app/db.sqlite3" \
  "${IMAGE_NAME}:${IMAGE_TAG}"

echo ">> Listo. Django escuchando en http://localhost:8000"
echo "   Contenedor: ${CONTAINER_NAME}"
