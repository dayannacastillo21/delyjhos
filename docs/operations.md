# Operación de DelyJhos

## Acceso

La aplicación pública está en `/`; la administración en `/#/admin`.
La cuenta inicial se consulta en `backend/.initial-admin.txt`. Este archivo no se publica, no se incluye en Docker y no debe compartirse en capturas.

Crea una cuenta administrativa personal en Usuarios. Una vez probada, puedes desactivar la cuenta inicial desde la otra cuenta. El sistema impide desactivar o quitar permisos a tu propia cuenta administrativa. Al actualizar una cuenta se revocan sus sesiones.

| Rol | Acceso |
| --- | --- |
| Administrador | Todos los módulos, incluidos usuarios |
| Encargado | Operaciones, reportes y configuración; sin administración de usuarios |
| Ventas | Clientes, pedidos, pagos de pedidos y cotizaciones; lectura de catálogo |
| Producción | Lectura de pedidos sin importes, inventario, recetas y catálogo; tareas e inicio/finalización de producción |

Recargar la página requiere volver a iniciar sesión porque el token no se persiste en el navegador. Una sesión caduca a las ocho horas, configurable mediante `SESSION_HOURS`.

## Catálogo

Crea categorías antes de productos. Usa slugs en minúsculas, con guiones y sin espacios. Desactivar un producto o categoría lo retira del catálogo público; no borra sus pedidos anteriores. Carga fotos reales desde Productos o Galería de productos.

## Ingredientes y recetas

Usa una unidad consistente por ingrediente. Por ejemplo, si eliges gramos, las compras y las recetas deben expresarse en gramos. No se realizan conversiones automáticas entre kg y g ni entre unidades de volumen y peso.

No se puede cambiar la unidad de un ingrediente que ya tenga compras, movimientos o recetas. Para corregir una unidad crea otro ingrediente y actualiza las recetas futuras.

El inventario comienza en cero. Registra las existencias iniciales como ajuste positivo con un motivo claro. Las mermas son ajustes negativos y no pueden superar las existencias.

El rendimiento de una receta es la cantidad de unidades de producto que prepara. El cotizador divide los ingredientes, la mano de obra y los gastos de receta entre ese rendimiento. El margen se calcula sobre el precio: `precio = costo / (1 - margen)`.

## Pedidos y cotizaciones

```text
Pendiente → Confirmado → En producción → Listo → Entregado
```

Se puede cancelar antes de entregar. No se puede retroceder entre estados, cambiar el precio del pedido mediante una solicitud pública ni entregar con saldo pendiente.

- **Pendiente:** solicitud registrada; no consume ingredientes.
- **Confirmado:** se congela receta y costo. Todos los productos necesitan una receta.
- **En producción:** se descuentan ingredientes en una transacción. Si falta uno, no se descuenta ninguno.
- **Listo:** la preparación terminó.
- **Entregado:** requiere saldo pagado.
- **Cancelado:** conserva el historial y no reintegra ingredientes consumidos.

Las cotizaciones personalizadas se revisan en Cotizaciones. Registra el precio y marca la solicitud como cotizada o aceptada. Después puedes convertirla en pedido: selecciona el producto cuya receta representa la torta completa y su tamaño. El pedido se crea con el precio aprobado, sin duplicar una conversión anterior.

Las tareas de producción se registran por pedido, fecha y responsable en Producción. El cambio de estado de una tarea no sustituye el cambio de estado del pedido.

## Pagos y compras

Los pagos son registros manuales de dinero recibido; la aplicación no cobra tarjetas ni confirma transferencias bancarias automáticamente. Selecciona el medio y conserva la referencia del comprobante.

Una compra pendiente no cambia el stock. «Recibir compra» añade cantidades, calcula el costo medio ponderado y registra los movimientos una sola vez. Usa ese flujo en lugar de un ajuste cuando exista un proveedor y una compra.

Cancelaciones con anticipos deben coordinarse con el cliente. El sistema conserva los registros y no ejecuta reembolsos ni compensa importes automáticamente.

## Seguimiento y privacidad

El cliente recibe un código privado al enviar el pedido. El código permite consultar únicamente número, estado y fecha, sin nombre, teléfono o pagos. Si pierde el código, un miembro autorizado del negocio debe atenderlo; no hay recuperación pública por número de pedido.

Las imágenes de referencia no deben contener datos personales. Se almacenan con nombres aleatorios, sin metadatos originales y sin listado público de archivos.

## Reportes

Inicio muestra datos reales: cobros de siete días, pedidos por estado, próximas entregas y stock bajo. No se presentan aumentos porcentuales ficticios. Las tablas permiten exportar la página filtrada a CSV; la exportación no incluye todas las páginas del historial automáticamente.

El calendario indica su límite de 200 pedidos recientes. El módulo Pedidos ofrece paginación para consultar el resto del historial. La rentabilidad es estimada; no reemplaza la contabilidad ni incluye todos los gastos generales.

## Validación antes del uso comercial

Confirmar con la pastelería: nombres y precios, porciones por producto, unidades de ingredientes, recetas, costos, fotos, alérgenos, capacidad diaria, anticipos mínimos y políticas de cancelación. La aplicación no inventa esos datos ni puede validarlos sin información del negocio.
