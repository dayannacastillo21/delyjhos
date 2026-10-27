# Bocaditos publicados y edición administrativa

## Estado actual

Por instrucción expresa de la propietaria se publicaron los 31 bocaditos del catálogo entregado, con 93 precios correspondientes a las presentaciones de 25, 50 y 100 unidades. Los precios de 2025 se copiaron como precios actuales autorizados; los valores históricos originales se conservan por separado.

Se guardaron 31 imágenes WebP locales: 30 proceden de las fotografías incrustadas en el PDF y una es una referencia externa para los alfajores de chocolate. Se reconstruyeron las máscaras originales del PDF; no se inventaron rellenos ni se reconstruyeron fotografías. Algunas variantes comparten la imagen de su familia de producto, igual que en el catálogo. La correspondencia está documentada en `frontend/public/media/snacks/sources.json` y `backend/app/data/snack-photos-2025.json`.

La foto externa es de Polat Eyyüp Albayrak, publicada en [Pexels](https://www.pexels.com/photo/delicious-alfajores-being-dusted-with-cocoa-30699392/), bajo la [licencia Pexels](https://www.pexels.com/license/). Se descargó una versión de 1000 px y se convirtió a WebP para la web. Se identifica y enlaza al fotógrafo desde el detalle del producto. Es una fotografía referencial, no una muestra de producción propia.

## Editar productos y precios

1. Entrar a Administración.
2. Abrir **Catálogo de bocaditos** y pulsar **Editar** en el producto.
3. Modificar nombre, foto, descripción, tipo, visibilidad o disponibilidad.
4. En **Precios por presentación**, cambiar los importes de 25, 50 y 100 unidades. La casilla de publicación permite mostrar el precio o dejarlo por confirmar.
5. Guardar. Los datos del producto y sus precios se actualizan juntos en una transacción.

El histórico no se altera al modificar los precios de venta. El módulo **Presentaciones y precios** continúa disponible para gestión avanzada, como asociar cada paquete con su producto y receta de producción.

## Publicación inicial controlada

`python -m app.publish_snack_catalog --apply`, ejecutado desde backend, registra en auditoría los valores anteriores y el origen de la foto. Una segunda ejecución omite los registros ya publicados y conserva cambios administrativos posteriores, incluidos precios, nombres, fotos y productos ocultados. No modifica recetas, ventas, existencias ni pedidos existentes.

La disponibilidad por fecha permanece sujeta a coordinación; publicar un precio no crea una reserva ni afirma existencias.
