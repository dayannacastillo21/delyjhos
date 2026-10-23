# Página principal y administración

La portada conserva la referencia visual rosada y el logo aportados por la usuaria. Las imágenes se incluyen localmente y se encuadran con CSS; se deben sustituir por fotografías individuales del negocio antes de la publicación comercial.

La versión actual incluye:

- Catálogo y categorías desde la API, búsqueda, filtros y galería de productos.
- Lista para solicitar pedidos, cantidades, datos de contacto y código privado de seguimiento.
- Cotizaciones personalizadas con carga de imágenes.
- Panel administrativo en `/#/admin`, conectado a PostgreSQL mediante FastAPI.

La lista previa al envío solo vive en memoria; los pedidos enviados sí se guardan. No hay cobros de tarjeta en el navegador.

Consulta [operación](operations.md) y el [README principal](../README.md) para conocer el flujo completo.
