# DelyJhos — Sistema de Gestión para Pastelerías

Proyecto Full Stack en desarrollo para la pastelería familiar DelyJhos.

Su objetivo es ofrecer una página para clientes y un sistema administrativo
que permita gestionar productos, pedidos personalizados y las operaciones
del negocio.

## Tecnologías

- Frontend: React, TypeScript, Vite y Tailwind CSS.
- Backend: Python y FastAPI.
- Base de datos: PostgreSQL alojado en Neon.
- ORM: SQLAlchemy con Psycopg.
- Migraciones: Alembic.
- Control de versiones: Git y GitHub.

## Arquitectura

Frontend React → API REST FastAPI → PostgreSQL

El frontend y el backend son aplicaciones separadas.
Las credenciales de la base de datos se utilizan únicamente en el backend.

## Estado actual

- Backend FastAPI con ruta principal de comprobación.
- Conexión con PostgreSQL verificada.
- Frontend con una primera pantalla de DelyJhos.
- Tailwind CSS configurado.
- Compilación y revisión con ESLint verificadas.

La aplicación todavía no implementa los módulos de negocio.

## Funcionalidades planificadas

- Catálogo de tortas, bocaditos, dulces y salados.
- Cotizaciones y pedidos personalizados.
- Administración de clientes, anticipos y pagos.
- Recetas, ingredientes, compras e inventario auditable.
- Calendario de producción y entregas.
- Ventas, costos y reportes.
- Autenticación, roles y permisos.

## Estructura

```text
DELYJHOS/
├── backend/
│   ├── app/
│   └── requirements.txt
├── frontend/
└── README.md
```

## Ejecutar en Windows

Requisitos utilizados durante la configuración:
Python 3.14, Node.js 24, npm y una base de datos PostgreSQL en Neon.

Ejecutar los comandos desde la raíz del repositorio.

### Backend

Crear el entorno virtual e instalar las dependencias:

```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

Crear `backend/.env` con una conexión propia:

```dotenv
DATABASE_URL="postgresql+psycopg://USUARIO:CONTRASENA@HOST/BASE_DE_DATOS?sslmode=require&channel_binding=require"
```

Sustituir los valores de ejemplo por las credenciales de PostgreSQL.
No subir el archivo `.env` a Git.

Iniciar la API:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

- API: http://127.0.0.1:8000/
- Documentación interactiva: http://127.0.0.1:8000/docs

La ruta principal comprueba que la API responde; no verifica la base de datos.

### Frontend

En otra terminal:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run dev
```

Abrir la dirección que muestre Vite, normalmente http://localhost:5173/.

### Comprobaciones del frontend

```powershell
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
```

## Seguridad

- Las credenciales se guardan en `backend/.env`, excluido de Git.
- El frontend no debe recibir la contraseña ni la conexión de PostgreSQL.
- El proyecto está en desarrollo y todavía no está preparado para producción.