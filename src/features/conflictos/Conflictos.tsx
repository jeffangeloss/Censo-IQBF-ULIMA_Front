/**
 * Conflictos de identidad.
 *
 * Un conflicto abierto inmoviliza su botella: la API rechaza cualquier pesada
 * mientras siga asi. Esta pantalla no lo hace cumplir —eso vive en la base—,
 * solo lo hace visible y da el camino para resolverlo con una foto que sostenga
 * la decision.
 */

import { useCallback, useEffect, useState } from "react";

import { ErrorApi, ErrorDeRed, api } from "@/api/cliente";
import type { Conflicto, EstadoConflicto } from "@/api/tipos";
import { useSesion } from "@/features/sesion/Sesion";
import { nombrarEnvase } from "@/shared/envase";
import { CapturaFoto } from "@/shared/foto/CapturaFoto";
import { VerFoto } from "@/shared/foto/VerFoto";
import { Aviso, Boton, Cargando, Etiqueta, Opciones } from "@/shared/ui/componentes";

const TONOS: Record<EstadoConflicto, "neutro" | "bien" | "aviso" | "mal"> = {
  ABIERTO: "mal",
  EN_ANALISIS: "aviso",
  RESUELTO: "bien",
  DESCARTADO: "neutro",
};

const TIPOS: Record<string, string> = {
  DOS_CODIGOS_UN_ENVASE: "Dos codigos en una botella",
  UN_CODIGO_VARIOS_ENVASES: "Un codigo en varias botellas",
  ETIQUETA_ILEGIBLE: "Etiqueta ilegible",
  SIN_PRESENTACION: "Sin presentacion",
  SIN_TARA: "Sin tara",
  SUNAT_DISCREPANTE: "Discrepancia con SUNAT",
  PESADA_INCOHERENTE: "Pesada incoherente",
  OTRO: "Otro",
};

export function Conflictos() {
  const [conflictos, setConflictos] = useState<Conflicto[] | null>(null);
  const [soloAbiertos, setSoloAbiertos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setConflictos(await api.conflictos(soloAbiertos));
    } catch (problema) {
      setError(
        problema instanceof ErrorDeRed
          ? "Sin conexion. Los conflictos necesitan red: resolverlos sobre datos viejos seria peor que esperar."
          : "No se pudieron cargar los conflictos.",
      );
    }
  }, [soloAbiertos]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!conflictos) return <Cargando texto="Cargando conflictos" />;

  return (
    <section className="pantalla">
      <h2 className="paso-titulo">Conflictos de identidad</h2>

      <Opciones
        etiqueta="Mostrar"
        valor={soloAbiertos ? "abiertos" : "todos"}
        opciones={[
          { valor: "abiertos", texto: "Sin resolver" },
          { valor: "todos", texto: "Todos" },
        ]}
        onCambio={(valor) => setSoloAbiertos(valor !== "todos")}
      />

      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      {conflictos.length === 0 ? (
        <p className="nota">
          {soloAbiertos
            ? "Ninguna botella esta inmovilizada ahora mismo."
            : "Todavia no se registro ningun conflicto."}
        </p>
      ) : (
        <ul className="lista">
          {conflictos.map((conflicto) => (
            <li key={conflicto.id_conflicto} className="lista__item">
              <button
                className="lista__boton"
                onClick={() =>
                  setAbierto(
                    abierto === conflicto.id_conflicto ? null : conflicto.id_conflicto,
                  )
                }
                aria-expanded={abierto === conflicto.id_conflicto}
              >
                <span className="lista__titulo">
                  {TIPOS[conflicto.tipo] ?? conflicto.tipo}
                </span>
                <span className="nota">
                  {conflicto.id_envase
                    ? nombrarEnvase(conflicto)
                    : "Sin botella asociada"}
                  {conflicto.codigo_a && conflicto.codigo_b
                    ? ` · ${conflicto.codigo_a} / ${conflicto.codigo_b}`
                    : ""}
                </span>
                <Etiqueta tono={TONOS[conflicto.estado]}>
                  {conflicto.estado.replace(/_/g, " ").toLowerCase()}
                </Etiqueta>
              </button>

              {abierto === conflicto.id_conflicto ? (
                <Detalle conflicto={conflicto} alResolver={cargar} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Detalle({
  conflicto,
  alResolver,
}: {
  conflicto: Conflicto;
  alResolver: () => Promise<void>;
}) {
  const { usuario } = useSesion();
  const [estado, setEstado] = useState<EstadoConflicto | null>(null);
  const [resolucion, setResolucion] = useState("");
  const [evidencia, setEvidencia] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrado =
    conflicto.estado === "RESUELTO" || conflicto.estado === "DESCARTADO";
  const puedeResolver = usuario.rol === "SUPERVISOR" || usuario.rol === "ADMIN";

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!estado) return;
    setGuardando(true);
    setError(null);
    try {
      await api.resolverConflicto(
        conflicto.id_conflicto,
        estado,
        resolucion.trim(),
        evidencia,
      );
      await alResolver();
    } catch (problema) {
      setError(
        problema instanceof ErrorApi
          ? problema.message
          : "No se pudo actualizar el conflicto.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="lista__cuerpo">
      <p>{conflicto.descripcion}</p>

      {conflicto.id_evidencia ? (
        <VerFoto id_evidencia={conflicto.id_evidencia} />
      ) : null}

      {cerrado ? (
        <Aviso tono="bien">
          {conflicto.estado === "RESUELTO" ? "Resuelto" : "Descartado"}:{" "}
          {conflicto.resolucion}
        </Aviso>
      ) : null}

      {!cerrado && !puedeResolver ? (
        <p className="nota">
          Resolver un conflicto lo firma un supervisor. Su rol es{" "}
          {usuario.rol.toLowerCase()}. Puede adjuntar una foto que ayude a
          decidirlo.
        </p>
      ) : null}

      {!cerrado ? (
        <>
          <CapturaFoto
            descripcion={`Conflicto ${conflicto.id_conflicto}`}
            alSubir={setEvidencia}
          />

          {puedeResolver ? (
            <form className="formulario" onSubmit={enviar}>
              <Opciones
                etiqueta="Que se decide"
                valor={estado}
                opciones={[
                  { valor: "EN_ANALISIS", texto: "Sigue en analisis" },
                  { valor: "RESUELTO", texto: "Resuelto" },
                  { valor: "DESCARTADO", texto: "Descartado" },
                ]}
                onCambio={setEstado}
              />
              <label className="campo">
                <span className="campo__etiqueta">Como se resolvio</span>
                <textarea
                  className="campo__control"
                  rows={3}
                  value={resolucion}
                  onChange={(e) => setResolucion(e.target.value)}
                  required={estado === "RESUELTO" || estado === "DESCARTADO"}
                />
                <span className="campo__ayuda">
                  Dar por cerrado un conflicto sin decir como no lo cierra: queda
                  el mismo problema, ahora invisible.
                </span>
              </label>
              {error ? <Aviso tono="mal">{error}</Aviso> : null}
              <Boton type="submit" disabled={guardando || !estado}>
                {guardando ? "Guardando…" : "Guardar"}
              </Boton>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
