#!/usr/bin/env sh
set -e

cd /app

# Si usamos Postgres, esperamos a que el servicio esté disponible antes de migrar
if [ "${DB_ENGINE:-}" = "django.db.backends.postgresql" ] || [ "${DB_ENGINE:-}" = "django.db.backends.postgresql_psycopg2" ]; then
  echo ">> Esperando PostgreSQL en ${DB_HOST:-db}:${DB_PORT:-5432}..."
  i=0
  until python -c "import os,socket; h=os.getenv('DB_HOST','db'); p=int(os.getenv('DB_PORT','5432')); s=socket.socket(); s.settimeout(1); s.connect((h,p)); s.close()"; do
    i=$((i+1))
    if [ $i -ge 60 ]; then
      echo "!! PostgreSQL no respondió a tiempo."
      exit 1
    fi
    sleep 1
  done
fi

# Si no hay migraciones para machinery, las generamos automáticamente (modo dev/local)
if [ ! -d "machinery/migrations" ] || [ ! -f "machinery/migrations/0001_initial.py" ]; then
  echo ">> No hay migraciones de 'machinery'. Ejecutando makemigrations..."
  python manage.py makemigrations machinery
fi

echo ">> Ejecutando migrate..."
python manage.py migrate --noinput

echo ">> Iniciando servidor..."
exec python manage.py runserver 0.0.0.0:8000
