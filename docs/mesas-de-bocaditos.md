# Mesas de bocaditos: de propuesta a entrega

## Configuración comercial

En «Presentaciones y precios» se puede vincular cada presentación con un producto de producción. Su receta representa **un paquete completo** de 25, 50 o 100 unidades: la cantidad del pedido cuenta paquetes, no bocaditos individuales. La receta debe tener sus ingredientes, rendimiento y costos reales. No se generaron recetas, precios actuales ni paquetes ficticios en la base de negocio.

«Paquetes de bocaditos» permite crear combinaciones con varias presentaciones y cantidades, guardarlas en borrador o publicarlas. Para publicar un paquete, sus bocaditos deben ser visibles. Si después se oculta un componente, el paquete deja de mostrarse al público. Los paquetes son combinaciones ajustables; su precio final se revisa en la cotización, sin descuentos inventados.

En Configuración se pueden definir un mínimo y máximo orientativos de bocaditos por invitado. Ambos quedan vacíos por defecto. La tienda solo muestra el rango cuando el negocio lo configura y el cliente indica invitados; se redondea hacia arriba y se identifica como orientación, sin modificar automáticamente cantidades.

## Experiencia del cliente

1. Elegir bocaditos o añadir un paquete completo; ajustar cantidades por presentación.
2. Indicar celebración, fecha, invitados y comentarios. La selección de identificadores y cantidades se conserva en este navegador; los datos personales no se guardan en localStorage.
3. Revisar el subtotal de los precios actuales confirmados. Si faltan precios, el subtotal parcial se distingue del total por cotizar.
4. Copiar el resumen o abrir WhatsApp con el contacto oficial configurado. No se envía ningún mensaje automáticamente. El botón de WhatsApp no se muestra si no se configuró un número.
5. Enviar la propuesta. El servidor toma nombres, presentaciones y precios desde sus registros, sin aceptar precios del navegador.
6. Guardar el código privado mostrado al recibir la solicitud. «Consultar esta propuesta» abre el seguimiento con ese código; también se puede usar el selector de tipo en el seguimiento público.

El código solo se muestra al crear la propuesta y se guarda como hash en el servidor. Se transmite en el cuerpo de una consulta POST, nunca en la URL. El seguimiento expone estado, fecha, selección, precio revisado cuando corresponde y estado del pedido asociado; no expone nombre, teléfono, notas internas ni códigos de otros pedidos. Las propuestas anteriores a esta ampliación no tienen código recuperable automáticamente.

## Revisión y conversión administrativa

1. Abrir «Mesas de bocaditos». Contactar al cliente, revisar disponibilidad y definir el total de la propuesta.
2. Registrar el estado «Aceptado» cuando el cliente acepte ese precio.
3. Abrir el detalle. Para cada presentación solicitada, seleccionar el producto cuya receta corresponde al paquete completo, revisar paquetes y precio por paquete. El vínculo configurado en la presentación sirve como selección inicial; la elección final queda guardada en el pedido y en el desglose revisado.
4. El desglose debe sumar exactamente el total aceptado, con decimales monetarios. Deben incluirse todas las presentaciones, sin líneas o productos de producción repetidos. Para cambiar variedades, revisar una nueva propuesta; la conversión no agrega ni elimina variedades silenciosamente.
5. Confirmar disponibilidad y correspondencia de las recetas. Crear el pedido. Se conserva la solicitud original, se guarda el desglose aprobado y se genera una tarea de preparación y un código privado de seguimiento del pedido.

La propuesta convertida queda vinculada a un solo pedido y no se edita directamente después. El servidor bloquea su fila durante la conversión; una segunda solicitud simultánea no duplica cliente, pedido o tarea. El índice único y la clave de solicitud protegen también la vinculación.

## Producción, inventario y entrega

- El pedido comienza pendiente. Confirmarlo congela las recetas y calcula costos, igual que los demás pedidos.
- Iniciar producción descuenta ingredientes por el número de **paquetes**. Dos paquetes de 25 cuentan como dos recetas de paquete; no como cincuenta recetas de paquete. El consumo sigue siendo idempotente y falla si no hay stock.
- Las tareas pendientes pasan a «En progreso» al iniciar producción y a «Terminada» al marcar el pedido listo. Cancelar un pedido cancela sus tareas abiertas. Las tareas no pueden iniciarse o darse por hechas antes de iniciar producción desde el pedido.
- Los anticipos y pagos utilizan las validaciones existentes; no se entrega un pedido con saldo pendiente. Cancelar no borra pagos ni restituye consumos automáticamente.
- El calendario y los reportes reciben el pedido por el flujo normal. Los precios finales del pedido son los aprobados para la mesa, sin modificar el catálogo público.

## Validación técnica

Las migraciones son aditivas y conservan propuestas y pedidos anteriores. Se verificaron migraciones desde cero en un esquema PostgreSQL temporal y dos conversiones simultáneas de una misma propuesta. Las pruebas de API cubren aceptación, sumas exactas, permisos, recetas faltantes, rollback, seguimiento privado, publicación de paquetes, rangos opcionales y límites básicos de solicitudes públicas.

Playwright cubre creación y publicación de paquetes desde administración, uso del rango y del enlace de WhatsApp, selección persistida, consulta de la propuesta con su código y conversión a un pedido con cantidades por paquete. Los datos de prueba se guardan solo en la base SQLite aislada del navegador de pruebas.
