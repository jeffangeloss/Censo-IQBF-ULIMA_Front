/**
 * Pantalla 3 — Cerrar.
 *
 * Ubicacion y condicion desde listas cerradas. La fecha, la hora, el usuario y
 * el identificador del registro los pone el sistema: no hay campo que llenar y
 * por lo tanto no hay campo que olvidar. Es la correccion directa a las 46
 * pesadas del Excel que quedaron sin fecha.
 *
 * `condicion` es la CONDICION del frasco, no su vigencia. La vigencia la
 * calcula el sistema desde la caducidad; confundir las dos fue lo que dejo 35
 * filas del Excel respondiendo a la pregunta equivocada.
 */

import { useState } from "react";

import type { Condicion, EnvaseDetalle, Posicion } from "@/api/tipos";
import { Boton, Campo, Opciones } from "@/shared/ui/componentes";
import { FichaEnvase } from "@/features/pesada/Pesada";

const POSICIONES = [
  { valor: "FRENTE", texto: "Frente" },
  { valor: "MEDIO", texto: "Medio" },
  { valor: "FONDO", texto: "Fondo" },
] as const satisfies readonly { valor: Posicion; texto: string }[];

const CONDICIONES = [
  { valor: "SELLADO", texto: "Sellado" },
  { valor: "ABIERTO", texto: "Abierto" },
  { valor: "A_LA_MITAD", texto: "A la mitad" },
  { valor: "AGOTADO", texto: "Agotado" },
  { valor: "DANADO", texto: "Dañado" },
  { valor: "RESIDUO", texto: "Residuo" },
] as const satisfies readonly { valor: Condicion; texto: string }[];

export interface BorradorCierre {
  posicion: Posicion | null;
  condicion: Condicion | null;
  observacion: string;
}

export function Cierre({
  envase,
  peso,
  alGuardar,
  alVolver,
  guardando,
}: {
  envase: EnvaseDetalle;
  peso: string;
  alGuardar: (cierre: BorradorCierre) => void;
  alVolver: () => void;
  guardando: boolean;
}) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [condicion, setCondicion] = useState<Condicion | null>(null);
  const [observacion, setObservacion] = useState("");

  return (
    <section className="pantalla">
      <h2 className="paso-titulo">
        <span className="paso-numero">3</span> Cerrar
      </h2>

      <FichaEnvase envase={envase} />

      <p className="confirmacion">
        Peso bruto registrado: <strong>{Number(peso).toFixed(2)} g</strong>
      </p>

      <form
        className="formulario"
        onSubmit={(evento) => {
          evento.preventDefault();
          alGuardar({ posicion, condicion, observacion: observacion.trim() });
        }}
      >
        <Opciones
          etiqueta="Posicion en el nivel"
          valor={posicion}
          opciones={POSICIONES}
          onCambio={setPosicion}
        />

        <Opciones
          etiqueta="Condicion del frasco"
          valor={condicion}
          opciones={CONDICIONES}
          onCambio={setCondicion}
        />

        <Campo
          etiqueta="Observacion"
          ayuda="Opcional. Cualquier cosa rara que vea."
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        <p className="nota-automatica">
          La fecha, la hora y su nombre se guardan solos.
        </p>

        <div className="acciones">
          <Boton type="button" variante="secundario" onClick={alVolver}>
            Volver
          </Boton>
          <Boton type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar pesada"}
          </Boton>
        </div>
      </form>
    </section>
  );
}
