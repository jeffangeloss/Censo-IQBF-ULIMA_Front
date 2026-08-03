# 02 · Convenciones

Mismas que `IQBF-ULIMA_Front`. Si dudas, gana lo que hace aquel repositorio: la
continuidad entre proyectos vale más que cualquier preferencia.

## Idioma

- **Código, identificadores y comentarios: español sin tildes.** `useEscaner`,
  `alSiguiente`, `enEspera`. Los nombres de dominio se quedan en español porque
  el dominio es español: `envase`, `pesada`, `zona`, `conflicto`.
- **Texto visible al usuario: español con tildes**, escrito para alguien de pie
  con una botella en la mano.
- **Documentación (`.md`): español con tildes.**

## Estructura

```
src/
├── api/                 cliente HTTP y tipos del contrato
├── app/                 cascarón, máquina de pasos, barra de estado, estilos
├── features/
│   ├── sesion/          entrar y sostener la sesión
│   ├── escaneo/         paso 1: QR y desambiguación
│   ├── pesada/          paso 2: peso en gramos
│   ├── cierre/          paso 3: posición, condición, observación
│   ├── resultado/       veredicto del servidor
│   ├── zonas/           barrido por nivel
│   ├── conflictos/      identidad dudosa y evidencia
│   └── avance/          tablero
└── shared/
    ├── offline/         cola en IndexedDB
    ├── qr/              BarcodeDetector con jsQR de respaldo
    ├── foto/            captura de evidencia y visor
    └── ui/              piezas comunes
tests/                   cola, errores y cliente
```

**Las funcionalidades no se importan entre sí.** Comparten solo lo que vive en
`shared/` y en `api/`. Si dos pantallas necesitan lo mismo, sube a `shared/`.

Alias `@` → `src/`. Configurado en `vite.config.ts` y `tsconfig`.

## Estilos

CSS plano en `src/app/estilos.css`, con variables en `:root` y bloque para tema
oscuro. Sin framework de utilidades y sin CSS-in-JS.

Nomenclatura tipo BEM en español: `.lista`, `.lista__boton`,
`.lista__boton--activo`. Antes de crear una clase, busca si ya existe: hay 60 y
media docena se repiten con nombres distintos si nadie mira.

**Mínimos que no se negocian:** objetivo táctil de 48 px, `:focus-visible`
visible en todo lo interactivo, y respeto a `prefers-reduced-motion`.

## Pruebas

```bash
npm test      # vitest, 30 pruebas, entorno node
```

Cubren la cola offline y el cliente HTTP. No hay pruebas de componentes: lo que
importa aquí no es que un botón se pinte, sino que una pesada no se pierda.

`tests/entorno.ts` sustituye solo lo que presta el navegador (IndexedDB con
`fake-indexeddb`, y `localStorage`). La lógica bajo prueba es la misma que se
empaqueta.

**Cuando corrijas un fallo, comprueba que la prueba lo atrapa:** revierte la
corrección, confirma que la prueba falla, y vuelve a aplicarla. Una prueba que
pasa igual con y sin el arreglo no prueba nada.

## Sin CDN

Todo se empaqueta. El lector de QR de respaldo (`jsqr`, 130 kB en su propio
trozo) va en el bundle y no en una red externa: si dependiera de una red que en
el sótano no existe, no serviría justo donde hace falta.

## Service worker

`public/sw.js` cachea el armazón para que la aplicación abra sin señal.
**Nunca cachea `/api/`.**
