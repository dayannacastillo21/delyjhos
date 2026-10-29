# Kardex físico de inventario

Abrir **Administración → Inventario y costos → Kardex**. Está disponible para los cuatro roles internos y requiere una sesión activa.

1. Seleccionar un ingrediente; las cantidades se expresan en su unidad base, sin conversiones.
2. Elegir opcionalmente Desde y Hasta y pulsar Consultar kardex. Los límites incluyen los días completos en `America/Lima`.
3. Revisar saldo inicial, entradas, salidas y saldo final del intervalo completo. La tabla muestra 50 movimientos por página en orden cronológico, con desempate por identificador.
4. Exportar el kardex completo a CSV. Incluye ingrediente, unidad, intervalo, totales, fecha, tipo, referencia, motivo, responsable y saldo. Si hay más de 20 000 movimientos, se debe acotar el intervalo; no se exporta silenciosamente una parte.

El saldo de cada fila utiliza `balance_after`, guardado al registrar compras, producción o ajustes. El saldo inicial se obtiene del saldo anterior al primer movimiento del intervalo. Cuando no hay movimientos en el intervalo se conserva el último saldo anterior al cierre; si el intervalo precede al historial, se utiliza el saldo previo al primer movimiento registrado. No se reconstruye la fecha de adquisición de existencias anteriores al historial.

Si el ingrediente no tiene ningún movimiento, se muestra su existencia actual y una advertencia: no acredita un saldo histórico. Si el saldo inicial más entradas menos salidas no coincide con el saldo final guardado, se muestra una alerta de conciliación. Consultar o exportar no modifica ni elimina movimientos.

Es un **kardex físico, no valorizado**: el historial existente no conserva el costo unitario y valor de inventario de cada movimiento. Aplicar retrospectivamente el costo actual daría importes incorrectos. Una valorización futura requerirá guardar esos costos al ocurrir cada movimiento y definir qué hacer con el historial sin valores monetarios.

API: `GET /api/v1/inventory/kardex?ingredient_id=1&from_date=2026-10-01&to_date=2026-10-31&limit=50&offset=0`. El límite de filas no altera los totales del periodo. La API devuelve cantidades como cadenas decimales con tres posiciones.
