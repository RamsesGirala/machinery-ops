# Machinery Ops (Demo local con Docker + Postgres + Backups)

Esta demo corre **local** con Docker Compose (Postgres + backend Django + frontend Vite/React).
Incluye un mecanismo simple de **backups automáticos** a una carpeta sincronizada con **Google Drive Desktop**.

---

## Requisitos

- Windows + **WSL2**
- **Docker Desktop** (con integración a WSL)
- Git
- (Opcional) **Google Drive Desktop** para sincronizar backups a la nube

---

## Arranque de la app

Desde la raíz del proyecto:

```bash
docker compose up --build -d
```

### Acceso desde el navegador

- Frontend: http://localhost:8001
- Backend/API: http://localhost:8000

---

## Apagar la app

Para apagar y eliminar contenedores/red:

```bash
docker compose down
```

### ¿Qué pasa si apago la PC sin correr `docker compose down`?

En general **no pasa nada grave**:
- Docker se corta de golpe (como un corte de luz).
- Postgres está preparado para esto y al volver a encender hace recuperación automática.

**Recomendación**: siempre que sea posible, usar `docker compose down` para un apagado limpio.
Si se apaga la PC sin el comando, normalmente al volver a levantar con `docker compose up -d` todo arranca bien.

---

## Backups automáticos (Google Drive Desktop)

### Cómo funciona

- Hay un servicio `backup` en el `docker-compose.yml`.
- Cada vez que arrancás la app con `docker compose up ...`, el contenedor `backup`:
  1. genera un backup de Postgres en formato **custom** (`pg_dump -Fc`)
  2. lo comprime a **.dump.gz**
  3. lo guarda en una carpeta local sincronizada por Google Drive Desktop
  4. aplica rotación: **solo mantiene los últimos 10 backups**

Al estar en una carpeta sincronizada, los backups quedan subidos a Drive sin tokens ni OAuth.

---

### 1) Instalar Google Drive Desktop

1. Instalar **Google Drive para escritorio**.
2. Iniciar sesión con la cuenta de Google.
3. Confirmar la carpeta local sincronizada (ejemplo):

```
C:\Users\ramse\GoogleDrive
```

4. Crear dentro:

```
C:\Users\ramse\GoogleDrive\machinery-ops\backups
```

---

### 2) Configurar la ruta de backups en docker-compose.yml

El contenedor corre en Linux (WSL2), por lo que la ruta Windows se referencia así:

- Windows:
```
C:\Users\ramse\GoogleDrive\machinery-ops\backups
```
- WSL2:
```
/mnt/c/Users/ramse/GoogleDrive/machinery-ops/backups
```

En el servicio `backup` del `docker-compose.yml`:

```yaml
volumes:
  - /mnt/c/Users/ramse/GoogleDrive/machinery-ops/backups:/backups
```

Si cambia el usuario o la ubicación de Drive, **solo hay que modificar esta ruta**.

---

### 3) Validar que los backups funcionan

- Arrancar:
```bash
docker compose up --build -d
```
- Verificar que aparece un archivo nuevo en la carpeta `backups`.
- Verificar que también aparece en Google Drive web.

**Rotación**:
- Al superar los 10 archivos, los más viejos se eliminan automáticamente.

---

## Restaurar un backup

### Qué hace el restore

- Detiene backend y frontend.
- Deja Postgres arriba.
- Pisa completamente la base de datos.
- Restaura desde el backup elegido.
- Vuelve a levantar backend y frontend.

---

### Script de restore

Archivo:
```
scripts/restore-backup.sh
```

Uso:

1. Elegir el backup `.dump.gz`.
2. Editar el script y pegar la ruta en:

```bash
BACKUP_PATH="/mnt/c/Users/ramse/GoogleDrive/machinery-ops/backups/machinery-ops-YYYYMMDD-HHMMSS.dump.gz"
```

3. Ejecutar:

```bash
chmod +x scripts/restore-backup.sh
./scripts/restore-backup.sh
```

Al finalizar, la app queda restaurada al estado del backup elegido.

---

## Notas finales

- Los backups se generan **al iniciar** la app.
- Se conservan **solo los últimos 10**.
- Para forzar un backup manual sin levantar todo el stack:

```bash
docker compose up --abort-on-container-exit backup
```
