/**
 * Cliente HTTP del backend de censo.
 *
 * Distingue tres cosas que el resto de la app necesita tratar distinto:
 * un error de negocio (el servidor contesto y dijo que no), un fallo de red
 * (no hubo respuesta, hay que encolar) y una sesion caida.
 */

import type {
  Avance,
  BusquedaPorCodigo,
  CierreResultado,
  Conflicto,
  EnvaseDetalle,
  EstadoConflicto,
  Evidencia,
  Pesada,
  PesadaEntrada,
  Problema,
  SesionIniciada,
  TipoConflicto,
  Usuario,
  ZonaDetalle,
  ZonaResumen,
} from "@/api/tipos";

// Se recorta y se le quita la barra final a proposito. El valor sale de un
// panel de despliegue, donde es facil que arrastre un espacio o una marca BOM
// invisible; si eso llega hasta aqui, la URL deja de ser absoluta y el
// navegador la resuelve contra el propio dominio, con un 405 como unica pista.
const BASE = (import.meta.env.VITE_API_URL ?? "")
  .replace(/^﻿/, "")
  .trim()
  .replace(/\/+$/, "");
const CLAVE_TOKEN = "censo.token";

/** El servidor contesto con un error. Trae el codigo del contrato. */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensaje: string,
    readonly problema?: Problema,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }

  /**
   * Reintentar no va a servir: el servidor juzgo el CONTENIDO de la solicitud
   * y ese juicio no va a cambiar (envase en conflicto, peso fuera de rango).
   *
   * 401 y 403 quedan fuera a proposito. Una jornada larga en el sotano puede
   * vencer el token con pesadas todavia en la cola; darlas por rechazadas por
   * eso seria descartar trabajo de campo valido. Se reintentan al volver a
   * entrar. Lo mismo con 408 y 429: el servidor pide esperar, no rechaza.
   */
  get definitivo(): boolean {
    if ([401, 403, 408, 429].includes(this.status)) return false;
    return this.status >= 400 && this.status < 500;
  }
}

/** No hubo respuesta. Hay que encolar y reintentar. */
export class ErrorDeRed extends Error {
  constructor(mensaje = "Sin conexion con el servidor") {
    super(mensaje);
    this.name = "ErrorDeRed";
  }
}

export function leerToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string | null): void {
  if (token) localStorage.setItem(CLAVE_TOKEN, token);
  else localStorage.removeItem(CLAVE_TOKEN);
}

/** Se dispara cuando el backend rechaza la sesion, para volver al login. */
type OyenteSesion = () => void;
const oyentes = new Set<OyenteSesion>();

export function alPerderSesion(oyente: OyenteSesion): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

async function pedir<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const token = leerToken();
  let respuesta: Response;

  // Una subida de foto va como multipart y el navegador tiene que poner el
  // Content-Type con su boundary. Fijarlo aqui romperia el envio.
  const esFormulario = opciones.body instanceof FormData;

  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      ...opciones,
      headers: {
        ...(esFormulario ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new ErrorDeRed();
  }

  if (respuesta.status === 204) return undefined as T;

  const texto = await respuesta.text();
  const cuerpo = texto ? JSON.parse(texto) : null;

  if (respuesta.ok) return cuerpo as T;

  const problema = cuerpo as Problema;
  const codigo = problema?.code ?? "ERROR_DESCONOCIDO";

  if (
    respuesta.status === 401 &&
    ["SESION_INVALIDA", "SESION_EXPIRADA", "TOKEN_INVALIDO", "NO_AUTENTICADO"].includes(
      codigo,
    )
  ) {
    guardarToken(null);
    oyentes.forEach((oyente) => oyente());
  }

  throw new ErrorApi(
    respuesta.status,
    codigo,
    problema?.detail ?? `Error ${respuesta.status}`,
    problema,
  );
}

export const api = {
  async login(email: string, password: string): Promise<SesionIniciada> {
    const sesion = await pedir<SesionIniciada>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    guardarToken(sesion.access_token);
    return sesion;
  },

  yo: () => pedir<Usuario>("/api/auth/yo"),

  async logout(): Promise<void> {
    try {
      await pedir<void>("/api/auth/logout", { method: "POST" });
    } finally {
      guardarToken(null);
    }
  },

  buscarPorCodigo: (codigo: string) =>
    pedir<BusquedaPorCodigo>(
      `/api/envases/por-codigo/${encodeURIComponent(codigo)}`,
    ),

  envase: (id: number) => pedir<EnvaseDetalle>(`/api/envases/${id}`),

  historial: (id: number) => pedir<Pesada[]>(`/api/envases/${id}/pesadas`),

  registrarPesada: (cuerpo: PesadaEntrada) =>
    pedir<Pesada>("/api/pesadas", {
      method: "POST",
      body: JSON.stringify(cuerpo),
    }),

  asignarEtiqueta: (id: number, id_fisico: string) =>
    pedir<EnvaseDetalle>(`/api/envases/${id}/etiqueta`, {
      method: "POST",
      body: JSON.stringify({ id_fisico }),
    }),

  registrarAlias: (id: number, codigo: string, cara?: string) =>
    pedir<unknown>(`/api/envases/${id}/alias`, {
      method: "POST",
      body: JSON.stringify({ codigo, cara: cara ?? null }),
    }),

  // ---------------------------------------------------------------- zonas

  zonas: () => pedir<ZonaResumen[]>("/api/zonas"),

  zona: (id: number) => pedir<ZonaDetalle>(`/api/zonas/${id}`),

  crearZona: (gabinete: string, nivel: string) =>
    pedir<ZonaDetalle>("/api/zonas", {
      method: "POST",
      body: JSON.stringify({ gabinete, nivel }),
    }),

  asignarEsperados: (id: number, ids_envase: number[]) =>
    pedir<ZonaDetalle>(`/api/zonas/${id}/esperados`, {
      method: "POST",
      body: JSON.stringify({ ids_envase }),
    }),

  cerrarZona: (id: number, conteo_fisico: number, observacion?: string) =>
    pedir<CierreResultado>(`/api/zonas/${id}/cerrar`, {
      method: "POST",
      body: JSON.stringify({ conteo_fisico, observacion: observacion || null }),
    }),

  reabrirZona: (id: number, motivo: string) =>
    pedir<ZonaDetalle>(`/api/zonas/${id}/reabrir`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    }),

  // ----------------------------------------------------------- conflictos

  conflictos: (soloAbiertos = false) =>
    pedir<Conflicto[]>(`/api/conflictos?abiertos=${soloAbiertos}`),

  abrirConflicto: (datos: {
    tipo: TipoConflicto;
    id_envase?: number | null;
    codigo_a?: string | null;
    codigo_b?: string | null;
    descripcion: string;
    id_evidencia?: number | null;
  }) =>
    pedir<Conflicto>("/api/conflictos", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  resolverConflicto: (
    id: number,
    estado: EstadoConflicto,
    resolucion: string,
    id_evidencia?: number | null,
  ) =>
    pedir<Conflicto>(`/api/conflictos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        estado,
        resolucion,
        id_evidencia: id_evidencia ?? null,
      }),
    }),

  // ----------------------------------------------------------- evidencias

  subirEvidencia: (imagen: Blob, descripcion?: string) => {
    const formulario = new FormData();
    formulario.append("archivo", imagen, "evidencia.jpg");
    if (descripcion) formulario.append("descripcion", descripcion);
    return pedir<Evidencia>("/api/evidencias", {
      method: "POST",
      body: formulario,
    });
  },

  /**
   * Trae la foto y devuelve una URL de objeto para ponerla en un <img>.
   *
   * No se puede apuntar el <img> directo al endpoint: el navegador no manda
   * la cabecera de sesion en la carga de una imagen y el servidor contestaria
   * 401. Quien la use debe revocar la URL al desmontar.
   */
  async evidenciaComoUrl(id: number): Promise<string> {
    const token = leerToken();
    let respuesta: Response;
    try {
      respuesta = await fetch(`${BASE}/api/evidencias/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ErrorDeRed();
    }
    if (!respuesta.ok) {
      throw new ErrorApi(
        respuesta.status,
        "EVIDENCIA_NO_DISPONIBLE",
        "No se pudo cargar la foto.",
      );
    }
    return URL.createObjectURL(await respuesta.blob());
  },

  // -------------------------------------------------------------- tablero

  avance: () => pedir<Avance>("/api/avance"),
};
