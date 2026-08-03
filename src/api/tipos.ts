/**
 * Tipos del contrato del backend.
 *
 * Los pesos viajan como CADENA, no como number. Un NUMERIC(14,4) convertido a
 * float binario pierde decimales, y aqui 0,0001 g es la resolucion de la
 * balanza. Solo se convierten a numero para mostrarlos.
 */

export type Rol = "CENSISTA" | "SUPERVISOR" | "ADMIN";

export type EstadoEnvase =
  | "PENDIENTE"
  | "EN_CONFLICTO"
  | "PENDIENTE_TARA"
  | "CENSADO"
  | "NO_ENCONTRADO"
  | "DESCARTADO";

export type Cara = "PRINCIPAL" | "POSTERIOR" | "LATERAL" | "TAPA" | "BASE";

export type Posicion = "FRENTE" | "MEDIO" | "FONDO";

export type Condicion =
  | "SELLADO"
  | "ABIERTO"
  | "A_LA_MITAD"
  | "AGOTADO"
  | "DANADO"
  | "RESIDUO";

export type TipoPesada =
  | "PRIMERA"
  | "REPESADA_DUDA"
  | "REPESADA_SEMAFORO"
  | "VERIFICACION_TARA"
  | "CORRECCION";

export interface Usuario {
  id_usuario: number;
  email: string;
  nombre: string;
  rol: Rol;
  estado: string;
}

export interface SesionIniciada {
  access_token: string;
  token_type: "bearer";
  expira_en: string;
  usuario: Usuario;
}

export interface EnvaseResumen {
  id_envase: number;
  id_fisico: string | null;
  estado: EstadoEnvase;
  insumo_texto: string | null;
  presentacion_texto: string | null;
  numero_lote: string | null;
  investigador_texto: string | null;
  codigo_sunat_declarado: string | null;
  tara_g: string | null;
  codigos: string[];
}

export interface Alias {
  id_alias: number;
  codigo: string;
  cara: Cara | null;
  origen: string;
  vigente: boolean;
}

export interface EnvaseDetalle extends EnvaseResumen {
  id_presentacion: string | null;
  pureza_texto: string | null;
  tara_origen: string | null;
  peso_neto_declarado_g: string | null;
  fecha_caducidad_declarada: string | null;
  fecha_caducidad_etiqueta: string | null;
  fecha_caducidad_efectiva: string | null;
  /** Dice si la vigencia se apoya en la etiqueta o solo en el Excel. */
  fuente_caducidad: "ETIQUETA" | "SOLO_EXCEL" | "SIN_FECHA";
  legibilidad: string | null;
  origen: string;
  observacion: string | null;
  conflictos_abiertos: number;
  alias: Alias[];
  ultima_pesada_g: string | null;
  ultimo_semaforo: string | null;
  fecha_ultima_pesada: string | null;
}

export interface BusquedaPorCodigo {
  codigo: string;
  ambiguo: boolean;
  coincidencias: EnvaseResumen[];
}

/** Lo que el celular encola. `client_uuid` lo genera el cliente. */
export interface PesadaEntrada {
  client_uuid: string;
  id_envase: number;
  tipo?: TipoPesada;
  peso_bruto_g: string;
  tara_aplicada_g?: string | null;
  balanza?: string | null;
  posicion?: Posicion | null;
  condicion?: Condicion | null;
  observacion?: string | null;
  anula_id_pesada?: number | null;
}

export interface Pesada {
  id_pesada: number;
  client_uuid: string;
  id_envase: number;
  tipo: TipoPesada;
  peso_bruto_g: string;
  tara_aplicada_g: string | null;
  peso_neto_g: string | null;
  semaforo: string;
  balanza: string | null;
  posicion: Posicion | null;
  condicion: Condicion | null;
  fecha_operacion: string;
  registrado_en: string;
  anula_id_pesada: number | null;
  observacion: string | null;
  ya_registrada: boolean;
}

/** Respuesta de error del backend (RFC 9457). */
export interface Problema {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  request_id: string;
  errors?: { field: string; message: string }[];
}
