#!/usr/bin/env sh
set -e

cd /app

# Si no hay migraciones para machinery, las generamos automáticamente (modo dev/local)
if [ ! -d "machinery/migrations" ] || [ ! -f "machinery/migrations/0001_initial.py" ]; then
  echo ">> No hay migraciones de 'machinery'. Ejecutando makemigrations..."
  python manage.py makemigrations machinery
fi

echo ">> Ejecutando migrate..."
python manage.py migrate --noinput

echo ">> Iniciando servidor..."
exec python manage.py runserver 0.0.0.0:8000
