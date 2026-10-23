# Despliegue

## Estado

La aplicación funciona en desarrollo con PostgreSQL en Neon. Se incluyen archivos Docker y CI, pero Docker no está instalado en el entorno revisado: las imágenes no se han construido ni ejecutado aquí. La aplicación no ha sido publicada en un proveedor de hosting.

## Variables

Backend:

- `DATABASE_URL`: conexión privada a PostgreSQL con Psycopg y TLS.
- `CORS_ORIGINS`: orígenes exactos del frontend separados por comas; sin rutas ni barra final.
- `SESSION_HOURS`: duración de las sesiones, por defecto 8.
- `UPLOAD_DIR`: directorio persistente para imágenes.
- `WHATSAPP_NUMBER`: valor inicial opcional; la configuración guardada en Administración tiene prioridad.

Frontend:

- `VITE_API_URL`: URL pública HTTPS de FastAPI, definida antes de compilar. No es una credencial.

Usa conexiones y cuentas distintas para pruebas y producción. Alembic necesita permisos de DDL; para la API en producción es preferible una cuenta con los permisos DML mínimos necesarios.

## Docker Compose para comprobar localmente

Con Docker instalado y `backend/.env` ya configurado:

```powershell
docker compose up --build
```

Abre http://localhost:8080/. La API usa el puerto 8000 y el directorio de imágenes tiene un volumen persistente. La base de datos sigue alojada en Neon; Compose no instala PostgreSQL en Windows.

Inicializa la cuenta, si aún no existe en esa base:

```powershell
docker compose exec api python -m app.bootstrap
```

La contraseña se guarda dentro del contenedor en `/app/.initial-admin.txt`. Consúltala privadamente y guárdala en un gestor de contraseñas antes de recrear el contenedor. No se crea una contraseña nueva si ya existe un administrador activo.

## Publicación

1. Elige un hosting que pueda ejecutar un servicio Python persistente y ofrecer HTTPS. El frontend puede servirse como archivos estáticos.
2. Configura secretos del backend en el proveedor, sin subir `.env` al repositorio.
3. Ejecuta `python -m alembic upgrade head` como paso de publicación controlado.
4. Compila el frontend con `VITE_API_URL` apuntando a la API pública.
5. Configura `CORS_ORIGINS` con el dominio real del frontend.
6. Monta almacenamiento persistente para `UPLOAD_DIR` o sustituye el almacenamiento local por un servicio de objetos antes de usar instancias efímeras o múltiples réplicas.
7. Verifica acceso, cierre de sesión, pedidos, uploads, recepción de compras y consumo de inventario desde el dominio publicado.
8. Configura copias de seguridad de PostgreSQL y del volumen de imágenes y realiza una restauración de prueba.

El Compose incluido contiene URLs locales; no se debe publicar sin adaptar sus dominios y configuración TLS. El Dockerfile inicia una sola instancia de API y aplica migraciones al arrancar; para réplicas utiliza un trabajo de migración separado y arranca Uvicorn sin ejecutar Alembic en cada réplica.

## GitHub Actions

El workflow instala dependencias y ejecuta:

- Migraciones desde cero y `alembic check` contra PostgreSQL 18.
- Tests de API y concurrencia en un esquema aislado.
- ESLint, Vitest, compilación y Playwright.

No necesita secretos de Neon: el CI usa un contenedor PostgreSQL desechable y una base SQLite exclusiva para los flujos de navegador. El workflow comenzará a ejecutarse cuando se publique en GitHub; no se declara aprobado hasta revisar su ejecución real.

## Fuentes técnicas

- [FastAPI: contraseñas y autenticación](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [SQLAlchemy: sesiones y bloqueos](https://docs.sqlalchemy.org/en/21/orm/session_api.html)
- [Neon: errores de conexión y restricciones del pooler](https://neon.com/docs/connect/connection-errors)
