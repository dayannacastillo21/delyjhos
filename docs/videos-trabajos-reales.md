# Trabajos reales: registro de las tandas procesadas

La galería reúne seis trabajos y doce fotografías WebP. Cada tanda se añade con identificadores nuevos; los originales y los derivados de las tandas anteriores se conservan.

Se revisaron los tres MP4 suministrados el 23 de octubre de 2026. Se preservaron los archivos de Downloads sin cambios y se guardaron copias verificadas por SHA-256 en `backend/media-originals/`, excluidas de Git y de Docker. Allí están las hojas de contacto, los fotogramas de revisión y el informe técnico original. No son necesarias para servir la web.

## Material revisado y entregables

| Trabajo | Archivo de origen (WhatsApp) | Duración | Resolución | Principal | Complementaria | Original | MP4 web |
|---|---|---:|---|---:|---:|---:|---:|
| K-pop en lila | 1.06.38 PM.mp4 | 29,30 s | 576 × 1024 | 28,13 s | 25,49 s | 5.032.352 bytes | 4.987.161 bytes |
| Bautizo blanco y dorado | 1.06.35 PM.mp4 | 25,20 s | 576 × 1024 | 23,50 s | 6,80 s | 4.336.941 bytes | 3.127.419 bytes |
| Fútbol celeste y blanco | 1.05.40 PM.mp4 | 16,83 s | 576 × 1024 | 6,56 s | 2,52 s | 2.914.448 bytes | 1.587.836 bytes |

Todos los nombres completos empiezan por `WhatsApp Video 2026-10-23 at `. Los originales contienen video H.264 y audio AAC. Se examinaron nueve momentos distribuidos por cada video y tres fotogramas adicionales para elegir encuadres. Los entregables son tres MP4 y seis fotografías WebP, en `frontend/public/media/works/`.

Reducción total de los MP4: 12.283.741 a 9.702.416 bytes (21,0 %). La primera pieza casi no reduce su peso: se priorizó conservar detalle. No se promete una mejora de resolución ni calidad equivalente a una fotografía de cámara.

## Tratamiento y límites

- FFmpeg: reducción suave de ruido, ajuste leve de contraste/gamma según cada toma y nitidez moderada. Los parámetros exactos y tiempos están en `scripts/work-videos.json` y el manifiesto generado.
- Se conserva resolución y encuadre; no hay ampliación artificial, recortes, interpolación, reconstrucción generativa ni eliminación de marcas de agua. Se conserva el audio AAC sin recodificar.
- Video H.264 y píxeles yuv420p, con metadatos de reproducción al principio del MP4 (`faststart`). Se decodificaron completos los tres resultados para detectar errores.
- Las fotografías se extraen del original con los ajustes definidos, sin pasar por el MP4 recomprimido. Se revisaron visualmente las tres principales.
- Se conservan las bandas negras que ya existen en ciertos tramos. En bautizo, el extremo de la decoración blanca superior está cortado en el original; no se reconstruye. Las complementarias son acercamientos, no promesas de una vista completa.
- El movimiento es principalmente de cámara recorriendo detalles. No se aplicó estabilización que recortara decoraciones o deformara las tortas. Los defectos de compresión existentes limitan el detalle recuperable.

## Integración en la aplicación

- Sección pública «Momentos que endulzamos», acceso «Nuestros trabajos», filtros por celebración y tres tarjetas con fotografías reales.
- Las miniaturas se cargan de forma diferida. Ningún MP4 se solicita al abrir la página: el reproductor se monta al abrir un trabajo. La reproducción se inicia mediante los controles nativos; solo hay un visor abierto a la vez. Puede ampliarse con los controles del navegador.
- Fotografías ampliadas con selector de principal y complementaria. CSS `object-fit: contain` conserva todo el encuadre.
- «Quiero una torta similar» abre la cotización con el trabajo elegido. Incluye celebración, temática, colores, porciones, sabor, relleno, mensaje, fecha, comentarios e imagen adicional opcional.
- El servidor valida que la referencia esté publicada y guarda una instantánea del título, fotos, video y producto relacionado. No acepta una referencia inventada por el cliente. Una modificación administrativa posterior no cambia los datos de esa instantánea.
- Administración ve la referencia junto con los datos del cliente. La conversión existente a pedido conserva los nuevos detalles y exige la revisión de precio habitual. No se crean productos, recetas ni importes ficticios al registrar los trabajos.
- El módulo «Nuestros trabajos» permite editar texto, celebración, visibilidad, fotografías, video y relación con un producto. Las cargas de video requieren administración/gerencia, MP4 H.264 y un máximo de 5 MB. La comprobación del servidor valida estructura del contenedor y marca de códec; no sustituye una revisión completa del contenido. El visor informa de errores de reproducción.

## Alojamiento elegido

Para esta muestra se usan archivos propios, servidos por Vite en desarrollo y por el servidor estático del frontend al desplegar. No se cargan reproductores ni scripts externos de TikTok. Esto permite conservar la referencia de cotización, controlar cuándo se solicita cada archivo y mantener la navegación dentro del sitio.

Se mantienen los créditos y marcas del material recibido. La cuenta y sus publicaciones externas no se descargaron ni verificaron como parte de este procesamiento. Para más volumen, se puede mover el material a almacenamiento de objetos/CDN; el costo y los límites dependerán del alojamiento y el tráfico. Los originales privados no se incorporan al contenedor web.

## Reproducir el proceso

Herramientas opcionales, separadas de las dependencias del backend:

```powershell
python -m pip install -r scripts/requirements-media.txt
python scripts/prepare_work_videos.py inspect
python scripts/prepare_work_videos.py build
```

La inspección se detiene si una copia original existente no coincide con el archivo de entrada; no la reemplaza. La construcción regenera solamente los derivados de los tres identificadores definidos en la configuración. Para otra tanda, asignar nuevos identificadores y revisar sus fotogramas antes de publicar.

Registro de datos tras aplicar las migraciones, desde backend:

```powershell
python -m alembic upgrade head
python -m app.import_works ../frontend/public/media/works/manifest.json
```

El importador es idempotente y no sobrescribe modificaciones administrativas. En despliegues separados, entregar el manifiesto al backend y publicar los MP4/WebP en el frontend antes de registrar los trabajos.

## Segunda tanda: Sonic, abejitas y temática científica

| Trabajo | Archivo de origen (WhatsApp) | Duración | Resolución original conservada | Principal | Complementaria | Original | MP4 web |
|---|---|---:|---|---:|---:|---:|---:|
| Sonic y Shadow | 1.05.37 PM.mp4 | 29,63 s | 480 × 848 | 25,78 s | 15,11 s | 4.753.319 bytes | 2.275.945 bytes |
| Abejitas y flores | 1.05.34 PM.mp4 | 38,07 s | 464 × 832 | 23,98 s | 19,42 s | 6.573.635 bytes | 3.201.154 bytes |
| Temática científica | 1.05.29 PM.mp4 | 30,83 s | 576 × 1024 | 19,42 s | 4,62 s | 4.994.376 bytes | 2.719.961 bytes |

Esta tanda reduce los MP4 de 16.321.330 a 8.197.060 bytes (49,8 %). Se revisaron nueve fotogramas distribuidos por video, las tres fotografías principales resultantes y las vistas originales seleccionadas. Se verificó la decodificación completa de los tres MP4 web.

- Sonic: se eligió una toma amplia que conserva los personajes, aros y base. La complementaria muestra los cake pops presentes en el mismo video; no se presupone que estén incluidos en un pedido ni se les asigna precio o sabor.
- Abejitas: se conserva el amarillo intenso que ya tiene el original, sin aumentar saturación. La principal conserva antenas y base; se mantienen las bandas negras incorporadas al video. La complementaria es un acercamiento de decoración.
- Científica: se conserva el microscopio y el conjunto de accesorios decorativos. El mensaje visible es de felicitación; no se inventa una profesión, graduación o especialidad específica.
- Los dos primeros archivos son de menor resolución que la primera tanda. No se ampliaron ni se presentaron como Full HD. Se aplicó reducción leve de ruido y nitidez moderada; solo Sonic y científica recibieron un ajuste pequeño de gamma.

Los identificadores son `work-04`, `work-05` y `work-06`. El importador utiliza las dimensiones de cada pieza y mantiene los valores anteriores de las ya registradas. Las comprobaciones SHA-256 verificaron que los seis archivos de Downloads y sus seis copias locales siguen sin cambios.

El procesador ahora permite construir únicamente una tanda, conservando los derivados anteriores:

```powershell
python scripts/prepare_work_videos.py build --only work-04 work-05 work-06
```

La inspección conserva los informes anteriores y reutiliza las hojas de contacto cuando el archivo archivado y la fuente coinciden. Las cargas nuevas siguen disponibles en «Nuestros trabajos» y en el flujo de cotización por referencia existente.
