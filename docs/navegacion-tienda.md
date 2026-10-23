# Navegación de la tienda

La tienda muestra una vista a la vez. Inicio contiene una presentación breve y una selección de productos; los catálogos, la galería y los formularios se abren por separado.

- `/#/`: Inicio.
- `/#/tortas`: catálogo de tortas.
- `/#/bocaditos`: catálogo de bocaditos y selección de presentaciones.
- `/#/arma-tu-mesa`: revisión de cantidades y solicitud de propuesta.
- `/#/nuestros-trabajos`: galería de trabajos reales con videos bajo demanda.
- `/#/personaliza`: solicitud de torta personalizada.
- `/#/nosotros`: presentación de la pastelería.
- `/#/contacto`: contacto y solicitud.
- `/#/admin`: administración existente.

Las rutas conservan su vista al recargar y funcionan con los botones Atrás y Adelante. Los antiguos enlaces como `#bocaditos` siguen abriendo la vista correspondiente. La selección de bocaditos continúa guardada en el navegador sin datos personales.

Los videos no se descargan ni reproducen automáticamente. Las miniaturas tienen una altura limitada; el reproductor mantiene la proporción original dentro de una ventana.

El estilo público se encuentra en `frontend/src/Storefront.css`, acotado a `.storefront` para conservar el diseño y funcionamiento de la administración. Las comprobaciones de navegación, recarga, historial, separación de vistas y anchura móvil están en `frontend/e2e/navigation.spec.ts`.
