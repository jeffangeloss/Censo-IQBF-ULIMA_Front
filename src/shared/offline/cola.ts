/**
 * Cola de pesadas pendientes de sincronizar.
 *
 * En el laboratorio no hay senal confiable. La pesada se guarda SIEMPRE en
 * IndexedDB antes de intentar enviarla: si el envio falla, el dato ya esta a
 * salvo en el telefono y se reintenta despues.
 *
 * El `client_uuid` lo genera el cliente antes de encolar. El servidor tiene
 * UNIQUE sobre esa columna, asi que reintentar un envio que en realidad si
 * llego es inofensivo: contesta 200 con el mismo registro en vez de duplicar.
 */

import { ErrorApi, ErrorDeRed, api } from "@/api/cliente";
import type { PesadaEntrada } from "@/api/tipos";

const BASE_DATOS = "censo-iqbf";
const ALMACEN = "pesadas_pendientes";
const VERSION = 1;

export interface PesadaPendiente {
  client_uuid: string;
  cuerpo: PesadaEntrada;
  etiqueta: string;
  creada_en: number;
  intentos: number;
  /** Presente solo cuando el servidor la rechazo definitivamente. */
  rechazo?: { codigo: string; detalle: string };
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(BASE_DATOS, VERSION);
    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;
      if (!bd.objectStoreNames.contains(ALMACEN)) {
        bd.createObjectStore(ALMACEN, { keyPath: "client_uuid" });
      }
    };
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

async function conAlmacen<T>(
  modo: IDBTransactionMode,
  accion: (almacen: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const bd = await abrir();
  return new Promise<T>((resolver, rechazar) => {
    const transaccion = bd.transaction(ALMACEN, modo);
    const solicitud = accion(transaccion.objectStore(ALMACEN));
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
    transaccion.oncomplete = () => bd.close();
  });
}

export function nuevoUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Respaldo para navegadores sin randomUUID en contexto no seguro.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

export async function encolar(
  cuerpo: PesadaEntrada,
  etiqueta: string,
): Promise<PesadaPendiente> {
  const pendiente: PesadaPendiente = {
    client_uuid: cuerpo.client_uuid,
    cuerpo,
    etiqueta,
    creada_en: Date.now(),
    intentos: 0,
  };
  await conAlmacen("readwrite", (almacen) => almacen.put(pendiente));
  return pendiente;
}

export function listar(): Promise<PesadaPendiente[]> {
  return conAlmacen("readonly", (almacen) => almacen.getAll());
}

export function quitar(client_uuid: string): Promise<undefined> {
  return conAlmacen("readwrite", (almacen) => almacen.delete(client_uuid));
}

async function guardar(pendiente: PesadaPendiente): Promise<void> {
  await conAlmacen("readwrite", (almacen) => almacen.put(pendiente));
}

export interface ResultadoSincronizacion {
  enviadas: number;
  rechazadas: number;
  quedan: number;
  sinRed: boolean;
}

/**
 * Intenta enviar todo lo pendiente.
 *
 * Un rechazo definitivo (el envase esta en conflicto, el peso no valida) NO se
 * borra: se marca y se queda visible. Descartar en silencio una pesada que el
 * servidor no acepto seria perder trabajo de campo sin que nadie se entere.
 */
export async function sincronizar(): Promise<ResultadoSincronizacion> {
  const pendientes = await listar();
  let enviadas = 0;
  let rechazadas = 0;
  let sinRed = false;

  for (const pendiente of pendientes) {
    if (pendiente.rechazo) {
      rechazadas += 1;
      continue;
    }
    try {
      await api.registrarPesada(pendiente.cuerpo);
      await quitar(pendiente.client_uuid);
      enviadas += 1;
    } catch (error) {
      if (error instanceof ErrorDeRed) {
        sinRed = true;
        break;
      }
      if (error instanceof ErrorApi && error.definitivo) {
        await guardar({
          ...pendiente,
          intentos: pendiente.intentos + 1,
          rechazo: { codigo: error.codigo, detalle: error.message },
        });
        rechazadas += 1;
        continue;
      }
      await guardar({ ...pendiente, intentos: pendiente.intentos + 1 });
      break;
    }
  }

  const quedan = (await listar()).length;
  return { enviadas, rechazadas, quedan, sinRed };
}
