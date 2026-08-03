# 01 · Contexto

## Qué es

PWA de captura en campo del censo físico de insumos químicos fiscalizados del
Laboratorio de Docimasia, Universidad de Lima. Consume la API de
`Censo-IQBF-ULIMA_Back`.

## Dónde se usa, de verdad

Esto no es una app de escritorio con tema oscuro. Las condiciones reales
gobiernan casi todas las decisiones de interfaz:

- **En un sótano, sin señal confiable.** Por eso todo lo que se escribe se
  encola en el teléfono antes de intentar enviarse.
- **Con una sola mano.** La otra sostiene una botella de ácido concentrado.
  Objetivos táctiles de 48 px mínimo, sin gestos finos, navegación abajo porque
  arriba no llega el pulgar.
- **De pie frente a un estante**, no sentado. Nada que exija leer un párrafo.
- **Sobre HTTPS obligatorio.** `getUserMedia` solo funciona en contexto seguro.
  En desarrollo se entra por `localhost`; en el laboratorio, por la URL de la
  nube. Fue una de las razones para desplegar allí y no en una laptop.

## Los dos modos de la aplicación

**El recorrido de captura es lineal** y se modela como una máquina de pasos, no
como un enrutador con URLs: escanear → pesar → cerrar → resultado → siguiente.
No hay a dónde enlazar ni nada que compartir, y una URL de más es una forma de
entrar al paso 2 sin haber pasado por el 1.

**Las otras tres secciones no son lineales** —niveles, conflictos y avance— y se
alcanzan desde una barra inferior.

## Qué NO hace esta aplicación

- No calcula el semáforo. Lo decide el servidor.
- No decide si un código ambiguo corresponde a una botella u otra. Muestra las
  coincidencias y obliga a elegir al operador.
- No borra ni edita una pesada. No existe ese endpoint.
- No declara que una botella no existe. Eso solo pasa al cerrar un nivel, y lo
  firma un supervisor.
- No cachea respuestas de la API. Un envase con datos viejos es peor que un
  error de red: el operador creería estar viendo el estado actual de la botella.
