# Auditoría — Censo IQBF (frontend)

Fecha: **2026-08-03**. Alcance: este repositorio y su contrato con
`Censo-IQBF-ULIMA_Back`.

## Método

Todo lo que se afirma se comprobó ejecutando `npm run typecheck`, `npm test` y
`npm run build`, e inspeccionando lo que `git ls-files` publica. Los tres
fallos de la sección siguiente se verificaron con **prueba de mutación**:
revertir la corrección, confirmar que la prueba falla, volver a aplicarla. Una
prueba que pasa igual con y sin el arreglo no prueba nada.

## Resumen

| | |
|---|---|
| Pruebas | 30, todas en verde |
| Typecheck | Limpio |
| Build de producción | Correcto |
| Bundle | 236 kB + 131 kB (jsQR, se carga solo si hace falta) |
| Fallos encontrados y corregidos | 3 |
| Hallazgos abiertos | 3 |
| Secretos expuestos | ninguno |

---

## Fallos encontrados y corregidos

### F-1 · Un token vencido descartaba trabajo de campo

**Severidad: alta. Corregido en el S3.**

`ErrorApi.definitivo` clasificaba como rechazo definitivo **cualquier** 4xx,
incluido el 401. El escenario real: el operador trabaja tres horas en el sótano
sin señal, el token vence con pesadas todavía encoladas, y al volver a subir
toda la cola queda marcada como rechazada sin reintento. Trabajo válido dado
por perdido.

Ahora solo cuenta como definitivo el juicio sobre el **contenido**. 401, 403,
408 y 429 se reintentan.

Prueba de mutación: al revertir, caen 2 pruebas.

### F-2 · La subida de fotos fijaba `Content-Type: application/json`

**Severidad: alta. Corregido en el S4.**

En multipart el `Content-Type` lo pone el navegador junto con su *boundary*.
Fijarlo a mano rompe el envío sin dar un error legible: el servidor recibe un
cuerpo sin boundary y contesta que faltan campos.

`pedir()` ahora detecta si el cuerpo es `FormData` y no declara el encabezado.

Prueba de mutación: al revertir, cae 1 prueba.

### F-3 · La evidencia se iba a mostrar con `<img src>` directo

**Severidad: media. Corregido en el S4.**

El navegador no manda la cabecera de sesión al cargar una imagen, así que cada
foto habría dado 401. Se trae con `fetch` y se convierte en URL de objeto,
revocada al desmontar.

---

## Hallazgos abiertos

### F-4 · La cámara nunca se ha ejecutado

**Severidad: media.** Ni el escaneo de QR (S3) ni la captura de evidencia (S4)
se han probado en un teléfono. `getUserMedia` y `BarcodeDetector` no existen
fuera de un navegador, de modo que **ninguna prueba automatizada los cubre ni
puede cubrirlos**.

Las 30 pruebas cubren la cola offline y el cliente HTTP —donde se decide si una
pesada se conserva o se pierde— y nada más. Verificarlo a mano en un teléfono,
contra las etiquetas ya impresas, es lo primero que hay que hacer en campo.

### F-5 · No hay pruebas de componentes

**Severidad: baja, y es deliberado.** No se cubre el renderizado. La decisión
fue concentrar el esfuerzo en la lógica que puede perder datos. Queda dicho aquí
para que se sepa que es una decisión y no un olvido.

### F-6 · El tablero y los conflictos no funcionan sin red

**Severidad: baja, y es deliberado.** No se cachean respuestas de la API. Un
envase con datos viejos es peor que un error de red, porque el operador creería
estar viendo el estado actual. Las tres secciones no lineales muestran un aviso
explicativo cuando no hay conexión, en vez de datos rancios.

---

## Comprobación de secretos

Correcto. No se rastrea ningún archivo sensible: `.env`, `.env.local`,
`.env.production`, `dist/` y `node_modules/` están en `.gitignore`. No hay
credenciales embebidas ni URLs internas en el código; la base de la API se toma
de `VITE_API_URL`.

---

## Coherencia con el backend

| Comprobación | Resultado |
|---|---|
| Tipos de `src/api/tipos.ts` frente al OpenAPI | Coinciden |
| Métodos de `api` frente a los endpoints publicados | Los 24 disponibles; se consumen 21 |
| Pesos tratados como cadena | Correcto en todo el cliente |
| Semáforo calculado en el cliente | No ocurre en ningún sitio |
| Funcionalidades que se importan entre sí | Ninguna |

---

## Accesibilidad y uso a una mano

| Comprobación | Resultado |
|---|---|
| Objetivo táctil mínimo | 48 px en botones, fichas y navegación |
| `:focus-visible` en todo lo interactivo | Sí |
| `prefers-reduced-motion` | Respetado |
| Tema claro y oscuro | Ambos, por variables CSS |
| Navegación al alcance del pulgar | Barra inferior, con `safe-area-inset` |
| Contraste | No medido con herramienta. Pendiente |
