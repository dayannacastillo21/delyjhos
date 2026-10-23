# Arquitectura y decisiones

## Auditoría inicial

Había una conexión funcional con Neon, una tabla `categories`, una migración aplicada y una portada React de muestra. La ruta de categorías aún no estaba registrada en `main.py`. No existían autenticación, pedidos, pagos, recetas, compras, inventario, administración ni pruebas automatizadas.

Se conserva el stack elegido y el historial de migraciones. Las nuevas migraciones añaden las tablas del negocio y la configuración pública; no borran categorías ni otros datos previos.

## Organización

Monolito modular FastAPI y aplicación React independiente. Los routers reciben y validan datos, los servicios ejecutan operaciones transaccionales y SQLAlchemy administra las sesiones. Alembic es la única vía para modificar el esquema en producción.

La administración usa formularios tipados por módulo y controla acciones visibles por rol. El backend aplica los permisos nuevamente; ocultar un botón nunca sustituye la autorización.

## Tablas

- Seguridad: `roles`, `users`, `auth_sessions`, `login_attempts`.
- Catálogo: `categories`, `products`, `product_images`.
- Clientes: `customers`, `quote_requests`.
- Operaciones: `orders`, `order_items`, `payments`, `production_tasks`.
- Inventario: `ingredients`, `recipes`, `recipe_ingredients`, `suppliers`, `purchases`, `purchase_items`, `inventory_movements`.
- Configuración y trazabilidad: `business_settings`, `audit_logs`.

## Seguridad

- Contraseñas con Argon2 mediante pwdlib; no se almacenan contraseñas en texto plano.
- Tokens aleatorios de sesión: en base de datos se guarda solamente su SHA-256, con vencimiento. El token vive en memoria del navegador y se revoca al salir o cambiar la cuenta.
- Cuatro roles: administrador, encargado, ventas y producción. Producción no recibe importes ni pagos de los pedidos.
- CORS enumera los orígenes permitidos. La autenticación usa Authorization, sin cookies automáticas del navegador.
- Intentos de acceso y solicitudes públicas limitados con registros persistentes. Para exposición a gran escala debe añadirse protección de tráfico en el proxy.
- El seguimiento usa un token privado enviado en el cuerpo de una solicitud POST, evitando incluirlo en la URL y en logs de acceso.
- Las imágenes se validan por contenido, se limitan en tamaño y dimensiones, se convierten a JPEG y reciben un nombre aleatorio. No se conserva el nombre suministrado ni los metadatos originales.
- El almacenamiento de imágenes es local al backend; necesita un volumen persistente al desplegarse. No se usa para almacenar documentos personales.
- Las respuestas no incluyen errores SQL ni secretos de configuración.

## Transacciones e idempotencia

Los pedidos se bloquean con `SELECT FOR UPDATE` al registrar pagos o cambiar estado. Los ingredientes se bloquean en orden estable para reducir bloqueos cruzados. Una transacción fallida revierte cantidades, estados y movimientos.

La restricción única `(source_key, ingredient_id)` impide registrar dos veces un consumo o una recepción. Las claves únicas de pedido, cotización y pago protegen contra reenvíos. Una clave de pago reutilizada con otros datos produce conflicto.

El costo y la receta se congelan al confirmar un pedido. Cambiar una receta posteriormente no altera pedidos confirmados. El consumo se redondea hacia arriba a la precisión de inventario (0.001 de la unidad base).

## Importes y reportes

Los precios y pagos usan `Numeric` y `Decimal`, no cálculos de dinero con coma flotante en el servidor. El navegador muestra importes, pero PostgreSQL y la API determinan el total definitivo.

Cobros y ventas son conceptos distintos: los cobros se calculan por pagos registrados; las ventas del reporte corresponden a pedidos entregados. La rentabilidad es una estimación con costos de receta, no un estado contable ni una declaración tributaria. Los días del reporte se calculan en America/Lima.

Las listas administrativas están paginadas. Pedidos y sus detalles se consultan por lotes para evitar una consulta adicional por cada fila. El calendario muestra los 200 pedidos más recientes y lo indica en pantalla.

## Extensiones futuras

Correo transaccional, recuperación de acceso por email, facturación, pasarelas de pago, reembolsos y análisis predictivo avanzado requieren acuerdos y configuración específicos del negocio. El promedio de demanda actual es una línea base descriptiva, habilitada con historia suficiente; no se presenta como una predicción de inteligencia artificial.
