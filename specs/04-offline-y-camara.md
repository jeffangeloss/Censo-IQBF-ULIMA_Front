# 04 · La cola offline y la cámara

Las dos partes difíciles. Si vas a tocar alguna, lee esto entero.

---

## La cola offline

`src/shared/offline/cola.ts`. Vive en IndexedDB, base `censo-iqbf`, almacén
`pesadas_pendientes`, clave `client_uuid`.

### La regla

**La pesada se guarda en el teléfono ANTES de intentar enviarla.** Siempre. Si
el envío falla, el dato ya está a salvo. Nunca se pierde una pesada por falta
de señal.

```
encolar(cuerpo, etiqueta)   →  IndexedDB
        ↓
api.registrarPesada(cuerpo) →  si falla, el dato sigue en IndexedDB
```

### Qué pasa con cada tipo de fallo

| Situación | Qué hace la cola |
|---|---|
| Sin red (`ErrorDeRed`) | Conserva, marca `sinRed`, **corta el bucle**. No gasta el resto de la cola contra un servidor que no responde |
| Rechazo definitivo (409, 422…) | **No borra.** Marca `rechazo` y la deja visible |
| Token vencido (401) | Conserva sin marcar. Se reintenta al volver a entrar |
| Error del servidor (5xx) | Conserva, incrementa `intentos`, corta |
| Aceptada | Borra de la cola |

**Lo rechazado no se borra nunca.** Descartar en silencio una pesada que el
servidor no aceptó sería perder trabajo de campo sin que nadie se entere. Queda
visible en la barra de estado con su motivo.

### Por qué el reintento es inofensivo

El `client_uuid` lo genera el cliente antes de encolar y el servidor tiene
`UNIQUE` sobre esa columna. Reintentar un envío que en realidad sí llegó
devuelve `200` con el mismo registro y `ya_registrada: true`, en vez de duplicar
la pesada.

### Lo que hay que preservar si la refactorizas

1. Escribir en IndexedDB antes de cualquier `fetch`.
2. No borrar por un rechazo.
3. No tratar 401/403/408/429 como definitivos.
4. Cortar el bucle al primer fallo de red.
5. Mostrar siempre cuántas quedan sin enviar. El operador tiene que poder ver,
   sin abrir nada, que su trabajo no se ha perdido: es la diferencia entre
   confiar en la app y volver al cuaderno.

Las cinco están cubiertas por `tests/cola.test.ts`.

---

## El escáner de QR

`src/shared/qr/useEscaner.ts`.

Usa `BarcodeDetector` cuando el navegador lo trae (Chrome en Android) y cae a
**jsQR empaquetado con la app** cuando no. El respaldo va en el bundle y no en
un CDN a propósito.

Detalles que importan:

- El cuadro se escala a **480 px de ancho** antes de analizarlo: suficiente para
  leer un QR de 25 mm y mucho más liviano que procesar el cuadro completo en un
  teléfono.
- Un QR se lee muchas veces por segundo; **solo interesa el cambio**. Se guarda
  el último valor leído y se ignoran las repeticiones.
- Un cuadro ilegible no es un error: se intenta con el siguiente.
- Vibración corta (40 ms) al leer, si el dispositivo la soporta.
- Al desmontar se detienen las pistas del `MediaStream`. Si no, la cámara se
  queda encendida.

---

## La cámara de evidencia

`src/shared/foto/useCamara.ts` y `CapturaFoto.tsx`.

- La foto se reduce a **1600 px de ancho** y JPEG de calidad 0,82 antes de
  subirla. Un celular moderno entrega 4000 px y 6 MB; para probar que una
  etiqueta dice `-98` de un lado y `-99` del otro sobra bastante menos, y en el
  sótano cada byte se paga en espera.
- **Hay una alternativa sin cámara a propósito** (`<input type="file">`). Un
  permiso denegado o un navegador viejo no puede dejar a nadie sin poder
  documentar lo que tiene delante.
- Las fotos **no se encolan**. Si no hay red, se avisa y se vuelve a tomar
  cuando la haya. Encolar imágenes llenaría el almacenamiento del teléfono sin
  que el operador lo note, y una foto se puede repetir; una pesada, no.

---

## Contexto seguro

`getUserMedia` exige HTTPS. Ambos hooks lo comprueban con
`window.isSecureContext` y dan un mensaje accionable en vez de fallar en seco.

En desarrollo se entra por `localhost` (que cuenta como seguro). En el
laboratorio, por la URL de la nube. **Entrar por la IP de una laptop no
funciona.**

---

## Lo que ninguna prueba cubre

`getUserMedia` y `BarcodeDetector` no existen fuera de un navegador real. Ni el
escaneo ni la captura de evidencia se han ejecutado nunca en un teléfono, y
ninguna prueba automatizada puede cubrirlos. Es la primera cosa que hay que
verificar a mano en campo.
