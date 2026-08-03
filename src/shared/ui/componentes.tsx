/**
 * Piezas de interfaz compartidas.
 *
 * Todo esta dimensionado para operarse con una mano: la otra sostiene un
 * frasco de acido concentrado. Objetivos tactiles de 48 px como minimo y nada
 * que exija precision al tocar.
 */

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Boton({
  variante = "principal",
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario" | "peligro";
}) {
  return (
    <button className={`boton boton--${variante}`} {...resto}>
      {children}
    </button>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  ...resto
}: InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      <input className="campo__control" {...resto} />
      {ayuda ? <span className="campo__ayuda">{ayuda}</span> : null}
    </label>
  );
}

export function Opciones<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: T | null;
  opciones: readonly { valor: T; texto: string }[];
  onCambio: (valor: T | null) => void;
}) {
  return (
    <div className="opciones">
      <span className="campo__etiqueta">{etiqueta}</span>
      <div className="opciones__lista">
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className={`ficha ${valor === opcion.valor ? "ficha--activa" : ""}`}
            aria-pressed={valor === opcion.valor}
            onClick={() => onCambio(valor === opcion.valor ? null : opcion.valor)}
          >
            {opcion.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Traduce el veredicto del servidor. Nunca lo calcula. */
const SEMAFOROS: Record<string, { tono: string; texto: string }> = {
  OK: { tono: "bien", texto: "Coherente" },
  TARA_REGISTRADA: { tono: "neutro", texto: "Tara registrada" },
  FALTA_TARA: { tono: "aviso", texto: "Falta tara: sin saldo" },
  ATENCION_DESVIO_15: { tono: "aviso", texto: "Desvio mayor al 15 %" },
  REVISAR_DESVIO_50: { tono: "mal", texto: "Desvio mayor al 50 %: repese" },
  REVISAR_SUPERA_LLENO: { tono: "mal", texto: "Pesa mas que llena: revise la tara" },
  IMPOSIBLE_NETO_NEGATIVO: { tono: "mal", texto: "Imposible: bruto menor que la tara" },
};

export function Semaforo({ valor }: { valor: string }) {
  const info = SEMAFOROS[valor] ?? { tono: "neutro", texto: valor };
  return (
    <p className={`semaforo semaforo--${info.tono}`} role="status">
      {info.texto}
    </p>
  );
}

export function Etiqueta({
  tono = "neutro",
  children,
}: {
  tono?: "neutro" | "bien" | "aviso" | "mal";
  children: ReactNode;
}) {
  return <span className={`pastilla pastilla--${tono}`}>{children}</span>;
}

const TONOS_ESTADO: Record<string, "neutro" | "bien" | "aviso" | "mal"> = {
  CENSADO: "bien",
  PENDIENTE: "neutro",
  PENDIENTE_TARA: "aviso",
  EN_CONFLICTO: "mal",
  NO_ENCONTRADO: "aviso",
  DESCARTADO: "mal",
};

export function EstadoEnvase({ estado }: { estado: string }) {
  return (
    <Etiqueta tono={TONOS_ESTADO[estado] ?? "neutro"}>
      {estado.replace(/_/g, " ").toLowerCase()}
    </Etiqueta>
  );
}

export function Aviso({
  tono = "aviso",
  children,
}: {
  tono?: "aviso" | "mal" | "bien";
  children: ReactNode;
}) {
  return (
    <div className={`aviso aviso--${tono}`} role="alert">
      {children}
    </div>
  );
}

export function Cargando({ texto = "Cargando" }: { texto?: string }) {
  return <p className="cargando">{texto}…</p>;
}
