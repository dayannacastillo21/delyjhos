# Preparación del negocio

En Administración → **Preparación del negocio**, administradores y encargados pueden consultar una revisión de solo lectura. «Actualizar revisión» vuelve a consultar los registros actuales; los botones llevan al módulo donde corregir cada pendiente.

Se comprueban cinco puntos:

- WhatsApp con código de país y formato válido. No comprueba la recepción de mensajes.
- Confirmación de la revisión del catálogo mediante la opción de datos de muestra. Desmarcarla es una decisión del negocio y no elimina productos.
- Productos activos con una receta que contenga ingredientes. No verifica que las cantidades sean las correctas ni que exista stock suficiente para un pedido concreto.
- Bocaditos publicados con las tres presentaciones (25, 50 y 100) y sus precios confirmados.
- Presentaciones publicadas vinculadas a un producto activo con receta e ingredientes, necesarias para convertir propuestas a producción.

El resultado **no certifica que la aplicación esté lista para producción**. Las recetas, existencias reales, alérgenos, HTTPS, almacenamiento persistente y una restauración de respaldo requieren comprobaciones independientes. La pantalla las enumera sin marcarlas automáticamente como realizadas.

La API `GET /api/v1/business/readiness` exige una sesión de administrador o encargado. Devuelve conteos y tareas; no expone credenciales, clientes ni información financiera. Consultarla no cambia productos, recetas, precios o inventario.
