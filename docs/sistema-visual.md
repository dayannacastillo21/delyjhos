# Sistema visual DelyJhos

## Dirección

Pastelería familiar con fotografías reales: superficies marfil, texto ciruela y rosa vino como acento. Los títulos editoriales usan Georgia y la interfaz Segoe UI/system-ui, disponibles en el dispositivo, sin descargas de fuentes ni dependencias adicionales. El espacio de administración mantiene tipografía sans-serif y una densidad apropiada para trabajar con tablas.

## Arquitectura de estilos

- `src/design/tokens.css`: paleta, superficies, tipografía, escalas de espacio, radios, sombras y movimiento compartidos. Se carga desde `index.css`.
- `src/design/StorefrontTheme.css`: jerarquía y estados comunes de la página pública. Se importa después de los estilos de componentes desde `App.tsx`.
- `src/design/WorkspaceTheme.css`: controles, tablas, acceso y superficies administrativas. Se importa desde `Admin.tsx`, manteniendo la carga separada del administrador.
- Los CSS de cada componente conservan su estructura y sus puntos de adaptación. Se retiraron más de 12 000 caracteres de reglas antiguas de hero, categorías y presentación que ya no correspondían a componentes renderizados, además del archivo responsive que ya no se importaba.
- `Primitives.tsx` comparte la introducción semántica de páginas y los estados de carga de tarjetas. `WorkspaceLoading.tsx` comparte los estados de carga de tablas y resumen; no simula datos.

Las nuevas superficies deben usar los tokens y los estilos comunes antes de añadir excepciones. Mantener la distinción entre títulos editoriales públicos y encabezados de trabajo administrativos.

## Pantallas

Inicio, Tortas, Bocaditos, Arma tu mesa, Personaliza, Nosotros y Contacto tienen composición adaptable. Personaliza divide información de contexto y formulario en escritorio, y los apila en móvil. Contacto presenta únicamente los canales configurados y la solicitud existente. Fotografías y videos conservan su contenido; no se generaron productos nuevos ni se alteraron precios.

Los detalles, formularios, respuestas de éxito/error, navegación, pie, modales, login, tablas, kardex y preparación del negocio comparten controles y estados. Se mantienen las rutas antiguas compatibles, la autenticación y los permisos existentes.

## Accesibilidad e interacción

- Controles públicos de texto a 16 px; botones principales con altura mínima de 48 px.
- Foco visible, controles semánticos y estados deshabilitados legibles.
- Las nuevas introducciones de catálogos tienen un encabezado principal.
- `prefers-reduced-motion` desactiva animaciones y desplazamiento suave.
- Contrastes calculados para los tokens principales: texto sobre papel 13.20:1; texto secundario sobre papel 5.49:1; blanco sobre botón principal 7.32:1; placeholder principal sobre blanco 4.89:1. Esto no equivale a una certificación de accesibilidad de todas las combinaciones posibles.

## Verificación

`e2e/design-review.spec.ts` recorre todas las vistas públicas a 320, 768, 1440 y 1920 px, verifica ausencia de desbordamientos y errores JavaScript y guarda capturas. También visita todos los módulos disponibles para un administrador y captura login, dashboard, formularios, kardex y configuración. Complementa las pruebas existentes de pedidos, cotizaciones, inventario, edición de precios, exportación, video y navegación con teclado.

Las capturas se generan en `frontend/test-results/`, excluido de Git. Los flujos de navegador usan una base de pruebas desechable; no escriben en Neon.
