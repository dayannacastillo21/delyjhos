# DelyJhos — Sistema de Gestión para Pastelerías

Aplicación Full Stack para una pastelería familiar: catálogo público, pedidos personalizados y administración de las operaciones del negocio.

## Tecnologías y arquitectura

- **Frontend:** React, TypeScript, Vite y Tailwind CSS.
- **Backend:** Python, FastAPI y Pydantic.
- **Datos:** PostgreSQL en Neon, SQLAlchemy, Psycopg y Alembic.
- **Calidad:** pytest, Vitest, Playwright y GitHub Actions.

```text
Navegador → React → API REST FastAPI → PostgreSQL
```

La contraseña de PostgreSQL solo existe en el backend. La sesión administrativa utiliza un token aleatorio revocable; se mantiene en memoria del navegador, sin guardarlo en localStorage.

## Funcionalidades implementadas

| Área | Funcionalidad |
| --- | --- |
| Página pública | Diseño adaptable, catálogo desde la API, categorías, búsqueda, detalles y galería |
| Bocaditos | 31 bocaditos publicados con foto, 93 precios del catálogo autorizados y editables, presentaciones de 25/50/100, paquetes configurables y guía opcional por invitados |
| Mesas | Propuestas con seguimiento privado, resumen para WhatsApp, revisión de precios y conversión a pedido, producción y entrega |
| Trabajos reales | Seis videos propios con doce fotos WebP, visor bajo demanda y cotización «Quiero una torta similar» con referencia conservada |
| Clientes | Solicitud de pedidos con cantidades y fecha, cotización de tortas con imagen, seguimiento privado |
| Administración | Inicio de sesión, cuatro roles, catálogo, clientes, proveedores y usuarios |
| Pedidos | Flujo de confirmación, producción, preparación y entrega; conversión de cotizaciones aprobadas |
| Pagos | Anticipos y saldos, validación de sobrepagos y protección de solicitudes repetidas |
| Recetas | Ingredientes, rendimientos, mano de obra y costos adicionales |
| Inventario | Compras, recepción, ajustes auditables, consumo por recetas y alertas de stock mínimo |
| Producción | Tareas, responsables, calendario y estados de pedidos |
| Reportes | Cobros diarios, ventas entregadas, rentabilidad estimada, productos vendidos y exportación CSV |
| Costos | Cotizador por receta, decoración y margen sobre precio de venta |
| Demanda | Promedio semanal, habilitado solo con historia suficiente; no es un modelo de ML entrenado |

Los seis productos iniciales conservan **datos e imágenes de muestra**. Deben reemplazarse o confirmarse antes de usar el catálogo comercialmente. Las fotografías se encuadran provisionalmente desde la referencia visual aportada por la propietaria del proyecto.

Los trabajos de «Momentos que endulzamos» utilizan los videos reales proporcionados, separados de esos productos de muestra. No tienen precios, recetas ni porciones inventadas. Ver [informe del procesamiento y registro de los videos](docs/videos-trabajos-reales.md) y [revisión e importación del catálogo de bocaditos](docs/catalogo-2025-revision.md).

El [flujo de mesas de bocaditos](docs/mesas-de-bocaditos.md) explica cómo vincular recetas de paquetes, revisar una propuesta aceptada y conservar sus cantidades, precios y seguimiento al convertirla en pedido.

## Arranque en Windows

Versiones verificadas durante el desarrollo: Python 3.14 y Node.js 24.
No se requiere instalar PostgreSQL en Windows.

### Backend

Desde la raíz del repositorio:

```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
```

Copia `backend/.env.example` a `backend/.env` **solo si no tienes ya uno**. Completa `DATABASE_URL` con tu conexión privada de Neon, comenzando por `postgresql+psycopg://` y conservando los parámetros TLS. Nunca compartas ni publiques el archivo `.env`.

Desde la carpeta `backend`:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.bootstrap --demo
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --no-access-log
```

`bootstrap` crea roles, categorías y la cuenta inicial; con `--demo` añade los seis productos de muestra. Es idempotente y no reemplaza registros existentes. La contraseña inicial aleatoria se guarda en **`backend/.initial-admin.txt`**, excluido de Git. El correo inicial `admin@example.com` es un identificador de ejemplo, no una cuenta de correo configurada.

- API: http://127.0.0.1:8000/
- Salud de PostgreSQL: http://127.0.0.1:8000/health
- OpenAPI: http://127.0.0.1:8000/docs

### Frontend

En otra terminal, desde la raíz:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run dev
```

- Página pública: http://localhost:5173/
- Administración: http://localhost:5173/#/admin

Por defecto el frontend consulta `http://127.0.0.1:8000`. Para cambiarlo configura `VITE_API_URL` en `frontend/.env` y reinicia Vite. Esta variable es pública: no contiene contraseñas ni claves privadas.

También se incluyen `scripts/start-api.ps1` y `scripts/start-web.ps1`, que inician cada servicio en su terminal. Si PowerShell bloquea scripts, utiliza los comandos anteriores; no hace falta cambiar las políticas del sistema.

## Uso inicial del negocio

1. Ingresa a Administración con la cuenta del archivo privado y crea tu propia cuenta administradora.
2. En Configuración, registra el WhatsApp con código de país y el contacto del negocio.
3. Confirma categorías, productos, fotos y precios. Desmarca «Catálogo con datos de muestra» cuando hayas terminado.
4. Crea ingredientes con su unidad base y registra el inventario inicial mediante un ajuste con motivo.
5. Asocia una receta a cada producto, con sus ingredientes, rendimiento y costos.
6. Registra compras y pulsa «Recibir» para incorporar cantidades y actualizar el costo medio ponderado.
7. Revisa pedidos y cotizaciones. La confirmación de un pedido requiere una receta válida.
8. Inicia producción para consumir ingredientes. Registra el saldo antes de marcar el pedido como entregado.

Las listas para cotizar del navegador se mantienen en memoria; los pedidos **enviados** y las cotizaciones sí se guardan en PostgreSQL. El código privado de seguimiento se entrega una vez: guárdalo. No contiene datos personales y permite consultar únicamente estado y fecha.

## Reglas de integridad

- Las cantidades y el dinero se almacenan con `Numeric`/`Decimal`.
- La confirmación congela receta y costo para ese pedido.
- La producción bloquea filas, valida existencias y registra movimientos únicos por pedido e ingrediente dentro de una transacción.
- Repetir producción o recibir la misma compra no duplica movimientos.
- Los pagos usan una clave de idempotencia y no pueden superar el saldo.
- Los ajustes requieren motivo y no pueden dejar existencias negativas.
- Los registros financieros y de inventario no tienen endpoints para borrar o editar su historial.
- Cancelar conserva pagos y consumos. No repone automáticamente ingredientes ya utilizados ni ejecuta reembolsos externos.

## Pruebas

Desde `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m alembic check
```

La suite ordinaria utiliza SQLite temporal con claves foráneas activadas. La prueba adicional de concurrencia PostgreSQL se habilita con `TEST_POSTGRES_URL`: crea un esquema aislado, aplica todas las migraciones y lo elimina al terminar. Para Neon usa una conexión directa; el pooler no admite el parámetro de arranque `search_path` utilizado por esa prueba. **No uses una cuenta sin permiso para crear y eliminar el esquema temporal.**

Desde la raíz:

```powershell
npm.cmd --prefix frontend run test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run test:e2e
```

Playwright usa una base SQLite desechable y los puertos 8001/5174, sin conectar con Neon. En Windows utiliza Chrome instalado. En CI instala Chromium. No inicies dos ejecuciones de Playwright simultáneamente.

## Estructura

```text
backend/
  app/
    models/          # Tablas y restricciones
    schemas/         # Validación de entrada y salida
    routers/         # Endpoints
    services.py      # Transacciones de pedidos, compras, pagos e inventario
    security.py      # Contraseñas Argon2, sesiones y autorización
    bootstrap.py     # Configuración inicial idempotente
  migrations/        # Historial de Alembic
  tests/             # API, transacciones y pruebas de concurrencia
frontend/
  src/
    admin/           # Administración, formularios, reportes y calendario
    CustomerForms.tsx
    App.tsx          # Página pública
    api.ts           # Cliente HTTP
  e2e/               # Flujos reales de navegador
scripts/             # Lanzadores para Windows
docs/                # Arquitectura, operación y despliegue
.github/workflows/   # Integración continua
```

## Despliegue y límites

Los archivos Docker y `compose.yaml` están preparados, pero requieren Docker y un entorno de hosting configurado. No se ha publicado la aplicación en internet ni se han contratado servicios.

Antes del uso comercial deben validarse precios, recetas, cantidades y fotografías con el negocio, configurar HTTPS y almacenamiento persistente para las imágenes, probar copias de seguridad y revisar los permisos de la cuenta de PostgreSQL. No hay pagos con tarjeta online, facturación tributaria, correo transaccional ni reembolsos automáticos. Las predicciones avanzadas requieren datos y evaluación posterior.

Más detalles en [operación](docs/operations.md), [arquitectura](docs/architecture.md) y [despliegue](docs/deployment.md).

La publicación de fotos y precios del catálogo, y su edición conjunta en administración, se documenta en [Bocaditos publicados](docs/bocaditos-publicados.md).

La [revisión de preparación del negocio](docs/preparacion-negocio.md) muestra los pendientes de configuración en Administración, sin modificar los datos ni certificar automáticamente el despliegue.
