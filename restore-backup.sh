#!/usr/bin/env bash
set -euo pipefail

# ============================
# CONFIGURACIÓN MANUAL
# ============================
# Pegá ACÁ la ruta exacta del backup a restaurar (.dump.gz)
BACKUP_PATH="/mnt/c/Users/ramse/GoogleDrive/machinery-ops/backups/machinery-ops-20260108-005527.dump.gz"
# ============================

if [[ ! -f "${BACKUP_PATH}" ]]; then
  echo "ERROR: No existe el archivo de backup:"
  echo "  ${BACKUP_PATH}"
  exit 1
fi

echo "==> Backup seleccionado:"
echo "    ${BACKUP_PATH}"
echo

echo "==> Verificando docker..."
docker compose version >/dev/null

# Asegurar DB arriba
echo "==> Levantando Postgres si no está activo..."
docker compose up -d db

# Parar servicios que escriben
echo "==> Deteniendo backend y frontend..."
docker compose stop backend frontend >/dev/null 2>&1 || true

# Obtener variables reales desde el contenedor
echo "==> Leyendo configuración de la DB..."
DB_NAME="$(docker compose exec -T db sh -lc 'printf "%s" "${POSTGRES_DB:-machinery_ops}"')"
DB_USER="$(docker compose exec -T db sh -lc 'printf "%s" "${POSTGRES_USER:-machinery}"')"

echo "    DB:   ${DB_NAME}"
echo "    USER: ${DB_USER}"
echo

# Limpiar schema
echo "==> Limpiando schema public..."
docker compose exec -T db sh -lc \
  "psql -U \"$DB_USER\" -d \"$DB_NAME\" -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'"

# Restore
echo "==> Restaurando backup..."
gunzip -c "${BACKUP_PATH}" | docker compose exec -T db sh -lc \
  "pg_restore -U \"$DB_USER\" -d \"$DB_NAME\" --no-owner --no-privileges --clean --if-exists"

echo
echo "==> Restore completado correctamente."

# Levantar servicios
echo "==> Levantando backend y frontend..."
docker compose up -d backend frontend

echo
echo "==> TODO LISTO."
echo "La base fue restaurada desde:"
echo "  ${BACKUP_PATH}"
