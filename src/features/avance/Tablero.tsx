/**
 * Tablero de avance.
 *
 * Solo lee. La pregunta que contesta no es "cuanto llevamos" sino "que falta
 * para poder exportar", que es distinta y bastante menos halagadora: un censo
 * puede estar al 100 % de botellas pesadas y seguir sin poder cerrarse.
 */

import { useCallback, useEffect, useState } from "react";

import { ErrorDeRed, api } from "@/api/cliente";
import type { Avance } from "@/api/tipos";
import { Aviso, Boton, Cargando, Etiqueta } from "@/shared/ui/componentes";

const BLOQUEOS: { clave: keyof Avance["bloqueos"]; texto: string }[] = [
  { clave: "sin_presentacion", texto: "Sin presentacion vinculada al maestro" },
  { clave: "sin_pesar", texto: "Todavia sin pesar" },
  { clave: "zona_sin_cerrar", texto: "En un nivel que no se ha cerrado" },
  { clave: "sin_tara", texto: "Sin tara: no hay saldo posible" },
  { clave: "con_conflicto_abierto", texto: "Con conflicto de identidad abierto" },
  { clave: "semaforo_bloqueante", texto: "Con semaforo que exige repesar" },
];

export function Tablero() {
  const [avance, setAvance] = useState<Avance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setAvance(await api.avance());
    } catch (problema) {
      setError(
        problema instanceof ErrorDeRed
          ? "Sin conexion. El tablero necesita red: no se cachea a proposito, un numero viejo enganaria."
          : "No se pudo cargar el avance.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando && !avance) return <Cargando texto="Cargando el avance" />;

  return (
    <section className="pantalla">
      <h2 className="paso-titulo">Avance del censo</h2>

      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      {avance ? (
        <>
          <div className="medidor">
            <div
              className="medidor__barra"
              style={{ width: `${avance.porcentaje_censado}%` }}
            />
            <span className="medidor__texto">
              {avance.censados} de {avance.envases_totales} censados ·{" "}
              {avance.porcentaje_censado} %
            </span>
          </div>

          <dl className="cuadricula">
            <div>
              <dt>Pendientes</dt>
              <dd>{avance.pendientes}</dd>
            </div>
            <div>
              <dt>Sin tara</dt>
              <dd>{avance.sin_tara}</dd>
            </div>
            <div>
              <dt>En conflicto</dt>
              <dd>{avance.en_conflicto}</dd>
            </div>
            <div>
              <dt>No encontrados</dt>
              <dd>{avance.no_encontrados}</dd>
            </div>
            <div>
              <dt>Con etiqueta pegada</dt>
              <dd>{avance.con_etiqueta}</dd>
            </div>
            <div>
              <dt>Codigos ambiguos</dt>
              <dd>{avance.codigos_ambiguos}</dd>
            </div>
          </dl>

          <h3 className="subtitulo">Que impide exportar</h3>
          <p className="nota">
            Un mismo envase puede aparecer en varias lineas: son razones, no
            categorias. La suma no tiene por que dar el total.
          </p>
          <ul className="lista">
            {BLOQUEOS.map(({ clave, texto }) => (
              <li key={clave} className="lista__fila">
                <span>{texto}</span>
                <Etiqueta tono={avance.bloqueos[clave] > 0 ? "aviso" : "bien"}>
                  {avance.bloqueos[clave]}
                </Etiqueta>
              </li>
            ))}
          </ul>

          <h3 className="subtitulo">
            Niveles ({avance.zonas_cerradas} de {avance.zonas_totales} cerrados)
          </h3>
          {avance.zonas.length === 0 ? (
            <p className="nota">Todavia no hay ningun nivel abierto.</p>
          ) : (
            <ul className="lista">
              {avance.zonas.map((zona) => (
                <li key={zona.id_zona} className="lista__fila">
                  <span>
                    {zona.gabinete} · nivel {zona.nivel}
                  </span>
                  <span className="nota">
                    {zona.censados}/{zona.esperados}
                  </span>
                  <Etiqueta tono={zona.estado === "CERRADA" ? "bien" : "neutro"}>
                    {zona.estado.toLowerCase()}
                  </Etiqueta>
                </li>
              ))}
            </ul>
          )}

          <div className="acciones">
            <Boton type="button" variante="secundario" onClick={() => void cargar()}>
              {cargando ? "Actualizando…" : "Actualizar"}
            </Boton>
          </div>
        </>
      ) : null}
    </section>
  );
}
