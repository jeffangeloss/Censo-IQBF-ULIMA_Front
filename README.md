# Censo IQBF — Frontend

PWA de captura en campo del censo físico de insumos químicos fiscalizados del
Laboratorio de Docimasia, Universidad de Lima.

Consume la API de `[Censo]IQBF-ULIMA_Back`. El diseño completo del sistema está
en `DISENO.md` del repositorio de backend.

## Estado

**Sprint 3 cerrado: el recorrido de captura funciona de punta a punta.** Entrar,
escanear, pesar, cerrar la botella y volver a empezar, con la cola offline
sosteniendo todo lo que no se pudo enviar.

Pendientes del Sprint 4: zonas y cierre de nivel, conflictos con evidencia
fotográfica y tablero de avance. Sus carpetas están creadas y vacías.

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5174
npm run build
npm run typecheck
npm test           # 20 pruebas
```

Las pruebas cubren la cola offline y la clasificación de errores del cliente,
que es donde se decide si una pesada se conserva o se da por perdida. Corren en
Node con `fake-indexeddb`, sin navegador ni backend levantado.

Lo que las pruebas **no** cubren es la cámara: `getUserMedia` y
`BarcodeDetector` no existen fuera de un navegador real. Esa parte se verifica a
mano en el teléfono, contra las etiquetas ya impresas.

El servidor de desarrollo redirige `/api` al backend en `http://127.0.0.1:8000`.
Se cambia con `VITE_API_URL`.

## Estructura

Misma convención que `IQBF-ULIMA_Front`: las funcionalidades no se importan
entre sí y comparten solo lo que vive en `shared`.

```
src/
├── api/                 cliente HTTP y tipos del contrato del backend
├── app/                 cascarón, máquina de pasos y barra de estado
├── features/
│   ├── sesion/          entrar y sostener la sesión
│   ├── escaneo/         paso 1: QR y desambiguación de códigos
│   ├── pesada/          paso 2: peso en gramos
│   ├── cierre/          paso 3: posición, condición y observación
│   ├── resultado/       veredicto del servidor y qué hacer con él
│   ├── zonas/           (Sprint 4) cierre de nivel
│   ├── conflictos/      (Sprint 4) identidad dudosa y evidencia fotográfica
│   └── avance/          (Sprint 4) tablero de indicadores
└── shared/
    ├── offline/         cola en IndexedDB con client_uuid e idempotencia
    ├── qr/              BarcodeDetector con jsQR empaquetado como respaldo
    └── ui/              piezas comunes pensadas para una sola mano
tests/                   cola offline y clasificación de errores
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

**Un rechazo no es lo mismo que un tropiezo.** La cola solo da por rechazada
una pesada cuando el servidor juzgó su contenido (envase en conflicto, peso
fuera de rango). Un 401 no cuenta: una jornada larga en el sótano puede vencer
el token con pesadas todavía encoladas, y darlas por rechazadas por eso sería
descartar trabajo de campo válido. Tampoco se borra lo rechazado —queda
visible—, porque perder en silencio una pesada que costó bajar al sótano es
peor que mostrar un error.

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
