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

// ------------------------------------------------------------------ zonas

export type EstadoZona = "ABIERTA" | "EN_CURSO" | "CERRADA";

export interface ZonaResumen {
  id_zona: number;
  gabinete: string;
  nivel: string;
  estado: EstadoZona;
  conteo_fisico: number | null;
  cerrada_en: string | null;
  reaperturas: number;
  /** Lo que el Excel dice que deberia estar aqui. */
  esperados: number;
  censados: number;
  pendientes: number;
  en_conflicto: number;
  no_encontrados: number;
  /** Lo que realmente se peso en este nivel. */
  pesados_aqui: number;
}

export interface EnvaseEnZona {
  id_envase: number;
  id_fisico: string | null;
  estado: EstadoEnvase;
  insumo_texto: string | null;
  numero_lote: string | null;
}

export interface ZonaDetalle extends ZonaResumen {
  observacion: string | null;
  motivo_reapertura: string | null;
  envases: EnvaseEnZona[];
}

export interface CierreResultado {
  zona: ZonaDetalle;
  /** Las que el cierre acaba de declarar inexistentes. */
  declarados_no_encontrados: number[];
  /** Contadas a ojo menos identificadas por el sistema. */
  diferencia_conteo: number;
}

// ------------------------------------------------------------- conflictos

export type TipoConflicto =
  | "DOS_CODIGOS_UN_ENVASE"
  | "UN_CODIGO_VARIOS_ENVASES"
  | "ETIQUETA_ILEGIBLE"
  | "SIN_PRESENTACION"
  | "SIN_TARA"
  | "SUNAT_DISCREPANTE"
  | "PESADA_INCOHERENTE"
  | "OTRO";

export type EstadoConflicto =
  | "ABIERTO"
  | "EN_ANALISIS"
  | "RESUELTO"
  | "DESCARTADO";

export interface Conflicto {
  id_conflicto: number;
  tipo: TipoConflicto;
  id_envase: number | null;
  id_fisico: string | null;
  insumo_texto: string | null;
  codigo_a: string | null;
  codigo_b: string | null;
  descripcion: string;
  estado: EstadoConflicto;
  resolucion: string | null;
  id_evidencia: number | null;
  detectado_en: string;
  detectado_por: number | null;
  resuelto_en: string | null;
  resuelto_por: number | null;
}

// ------------------------------------------------------------- evidencias

export interface Evidencia {
  id_evidencia: number;
  sha256: string;
  mime: string;
  bytes: number;
  tomada_en: string | null;
  subida_en: string;
  subida_por: number | null;
  descripcion: string | null;
  /** La misma foto subida dos veces devuelve el registro que ya existia. */
  ya_existia: boolean;
}

// ---------------------------------------------------------------- tablero

export interface BloqueosExportacion {
  sin_presentacion: number;
  sin_tara: number;
  con_conflicto_abierto: number;
  semaforo_bloqueante: number;
  sin_pesar: number;
  zona_sin_cerrar: number;
}

export interface ZonaAvance {
  id_zona: number;
  gabinete: string;
  nivel: string;
  estado: EstadoZona;
  esperados: number;
  censados: number;
  pendientes: number;
  no_encontrados: number;
  conteo_fisico: number | null;
}

export interface Avance {
  envases_totales: number;
  censados: number;
  pendientes: number;
  sin_tara: number;
  en_conflicto: number;
  no_encontrados: number;
  con_etiqueta: number;
  sin_presentacion: number;
  semaforo_imposible: number;
  semaforo_revisar: number;
  semaforo_atencion: number;
  conflictos_abiertos: number;
  zonas_cerradas: number;
  zonas_totales: number;
  incidencias_abiertas: number;
  codigos_ambiguos: number;
  porcentaje_censado: number;
  bloqueos: BloqueosExportacion;
  zonas: ZonaAvance[];
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
