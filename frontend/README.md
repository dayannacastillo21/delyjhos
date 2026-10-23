# Frontend de DelyJhos

Consulta el [README principal](../README.md) para la instalación del proyecto completo.

Desde esta carpeta:

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run test
npm.cmd run test:e2e
```

La página pública consulta la API configurada en `VITE_API_URL`. La administración está en `/#/admin` y utiliza los mismos datos del backend, con permisos por rol.

Los productos iniciales y las imágenes de referencia son muestras que deben confirmarse con el negocio. Los pedidos y cotizaciones enviados se guardan en PostgreSQL; no se simula su recepción en el navegador.
