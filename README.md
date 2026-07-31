# Censo IQBF — Frontend

PWA de captura en campo del censo físico de insumos químicos fiscalizados del
Laboratorio de Docimasia, Universidad de Lima.

Consume la API de `[Censo]IQBF-ULIMA_Back`. El diseño completo del sistema está
en `DISENO.md` del repositorio de backend.

## Estado

**Andamio listo, PWA pendiente.** El Sprint 1 fue backend: esquema, precarga del
Excel, catálogo de referencia y generación de etiquetas QR. Este repositorio
existe desde ahora para que la estructura y el despliegue queden fijados, y
compila y despliega tal cual está.

Las tres pantallas llegan en el Sprint 3. Mientras tanto el censo avanza con el
archivo `Censo_IQBF_v3_TRAZABLE` y las etiquetas ya impresas.

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5174
npm run build
npm run typecheck
```

El servidor de desarrollo redirige `/api` al backend en `http://127.0.0.1:8000`.
Se cambia con `VITE_API_URL`.

## Estructura

Misma convención que `IQBF-ULIMA_Front`: las funcionalidades no se importan
entre sí y comparten solo lo que vive en `shared`.

```
src/
├── api/                 cliente generado del OpenAPI del backend
├── app/                 cascaron, enrutado y estilos base
├── features/
│   ├── escaneo/         pantalla 1: QR y desambiguación de códigos
│   ├── pesada/          pantalla 2: peso en gramos y semáforo
│   ├── zonas/           pantalla 3: ubicación, condición y cierre de nivel
│   ├── conflictos/      identidad dudosa y evidencia fotográfica
│   └── avance/          tablero de indicadores
└── shared/
    ├── offline/         cola en IndexedDB con client_uuid e idempotencia
    └── qr/              BarcodeDetector con jsQR empaquetado como respaldo
```

## Decisiones que condicionan la implementación

**La cámara exige HTTPS.** `getUserMedia` solo funciona en contexto seguro. En
desarrollo se entra por `localhost`; en el laboratorio, por la URL de la nube.
Fue una de las razones para desplegar allí y no en una laptop local.

**Sin CDN.** El lector de QR de respaldo se empaqueta con la app. Si depende de
una red que en el sótano no existe, no sirve.

**La escritura se encola, no se envía.** Cada registro lleva un `client_uuid`
generado en el cliente antes de encolarse. El servidor tiene
`UNIQUE (client_uuid)`, así que un reintento duplicado es inofensivo. La app
muestra siempre cuántos registros quedan por sincronizar.

**El semáforo se muestra, no se calcula.** Lo decide el servidor. Con clientes
offline y versiones distintas de la app, el mismo peso daría veredictos
distintos si lo calculara el navegador.

**Un código ambiguo no se resuelve solo.** `GET /api/envases/por-codigo/{codigo}`
devuelve una lista, no un objeto: cuando el código apunta a varios envases —hay
uno que apunta a 11— la pantalla muestra las coincidencias y obliga a elegir.
Es la traducción del problema del `Ctrl+F` a una decisión explícita.

**Se diseña para una mano.** El operador tiene la otra ocupada sosteniendo un
frasco de ácido concentrado. Objetivos táctiles grandes, sin gestos finos, y
nada que exija precisión al tocar.
