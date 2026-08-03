# Specs — Censo IQBF (frontend)

Para que alguien que llega nuevo —persona o agente— pueda trabajar aquí sin
romper nada. Cada archivo recoge decisiones ya tomadas, con el motivo, para que
no se rediscutan.

## Léelo en este orden

| Archivo | Qué contesta |
|---|---|
| [`01-contexto.md`](01-contexto.md) | Qué es esta PWA, quién la usa y en qué condiciones |
| [`02-convenciones.md`](02-convenciones.md) | Cómo se escribe código aquí |
| [`03-contrato-api.md`](03-contrato-api.md) | Qué espera el backend y qué devuelve |
| [`04-offline-y-camara.md`](04-offline-y-camara.md) | Las dos partes difíciles, en detalle |

El diseño del sistema completo y los invariantes están en el repositorio del
backend: `DISENO.md` y `specs/`.

## Antes de proponer un cambio

1. **Corre todo.** Los tres deben pasar:
   ```bash
   npm run typecheck
   npm test          # 30 pruebas
   npm run build
   ```
2. **Si tocas la cola offline o el cliente HTTP, escribe la prueba primero.** Es
   donde se decide si una pesada se conserva o se pierde, y donde ya se colaron
   tres fallos (ver `AUDITORIA.md`).
3. **No calcules nada que decida el servidor.** El semáforo, el estado del
   envase y el veredicto de una pesada llegan calculados. Mostrarlos, nunca
   recalcularlos.
4. **Piensa con una mano.** La otra sostiene un frasco de ácido concentrado.

## Quién manda cuando hay duda

El backend. La tabla de endpoints de su README es el contrato. Si el frontend
necesita un dato que no está, se pide un cambio allí; no se deduce aquí.
