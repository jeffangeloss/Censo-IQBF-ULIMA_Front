# 03 · Contrato con el backend

La fuente de verdad es la tabla de endpoints del README de
`Censo-IQBF-ULIMA_Back` y su `/api/openapi.json`. Este archivo recoge lo que hay
que saber para no equivocarse al consumirlo.

## Errores

El backend responde **problem+json (RFC 9457)**. `src/api/cliente.ts` distingue
tres cosas que el resto de la aplicación trata distinto:

| Clase | Cuándo | Qué hacer |
|---|---|---|
| `ErrorApi` | El servidor contestó y dijo que no | Mostrar `problema.detail`; usar `code` si hay que ramificar |
| `ErrorDeRed` | No hubo respuesta | Encolar y reintentar |
| Sesión caída | 401 con código de sesión | Se borra el token y se avisa a `alPerderSesion` |

### `ErrorApi.definitivo` — leer esto antes de tocarlo

Marca si reintentar tiene sentido. **No es «todo 4xx».**

```ts
if ([401, 403, 408, 429].includes(this.status)) return false;
return this.status >= 400 && this.status < 500;
```

401 y 403 quedan fuera **a propósito**: una jornada larga en el sótano puede
vencer el token con pesadas todavía encoladas, y darlas por rechazadas
descartaría trabajo de campo válido. 408 y 429 tampoco: el servidor pide
esperar, no rechaza.

Definitivo es solo el juicio sobre el **contenido**: envase en conflicto, peso
fuera de rango, validación.

## Los pesos son cadenas, no números

`NUMERIC(14,4)` convertido a float binario pierde decimales, y 0,0001 g es la
resolución de la balanza. Los tipos declaran `string` y solo se convierten a
número **para mostrarlos**. Nunca para operar ni para reenviar.

## Idempotencia

`POST /api/pesadas` exige un `client_uuid` que **genera el cliente antes de
encolar**. Si la cola reintenta un envío que ya llegó, la API devuelve el mismo
registro con `ya_registrada: true` en vez de duplicar.

Lo mismo con `POST /api/evidencias`: la misma imagen devuelve
`ya_existia: true` y el mismo `id_evidencia`, porque el servidor la identifica
por `sha256`.

## La búsqueda devuelve una lista

`GET /api/envases/por-codigo/{codigo}` devuelve **siempre un arreglo**, aunque
haya una sola coincidencia. `IQF0102-69-117` apunta a 11 envases. La
desambiguación es del operador, con la botella en la mano; la interfaz debe
mostrar las coincidencias y obligar a elegir.

## Subida y descarga de fotos

Son las dos únicas peticiones que se salen del patrón JSON.

**Subida:** es la única que **no** declara `Content-Type`. En multipart lo pone
el navegador junto con su *boundary*; fijarlo a mano rompe el envío sin dar un
error legible —el servidor recibe un cuerpo sin boundary y contesta que faltan
campos. `pedir()` lo detecta mirando si el cuerpo es `FormData`.

**Descarga:** no se puede apuntar un `<img src>` al endpoint, porque el
navegador no manda la cabecera de sesión al cargar una imagen y recibiría un
401. Se trae con `fetch` y se convierte en URL de objeto, que hay que **revocar
al desmontar**. Eso hace `shared/foto/VerFoto.tsx`.

## Roles

`usuario.rol` llega en el login: `CENSISTA`, `SUPERVISOR` o `ADMIN`.

| Acción | Rol mínimo |
|---|---|
| Escanear, pesar, abrir conflicto, subir foto | `CENSISTA` |
| Cerrar un nivel, resolver un conflicto | `SUPERVISOR` |
| Reabrir un nivel cerrado | `ADMIN` |

La interfaz oculta o explica lo que el rol no permite, pero **el servidor es
quien decide**. Ocultar un botón no es un control de acceso.

## Lo que no existe en el contrato

No hay `PUT` ni `DELETE` sobre pesadas. No es que estén prohibidos: no existen.
Corregir es registrar una pesada de tipo `CORRECCION` con `anula_id_pesada`, y
la anulada sigue apareciendo en el historial.
