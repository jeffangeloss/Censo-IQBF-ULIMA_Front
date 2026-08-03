/**
 * Resultado de la pesada.
 *
 * Con red, muestra el semaforo que devolvio el servidor. Sin red, dice que
 * quedo en cola y que el veredicto llega al sincronizar: no se inventa uno.
 */

import type { EnvaseDetalle, Pesada } from "@/api/tipos";
import { nombrarEnvase } from "@/shared/envase";
import { Aviso, Boton, Semaforo } from "@/shared/ui/componentes";

export type ResultadoPesada =
  | { estado: "enviada"; pesada: Pesada }
  | { estado: "encolada"; peso_bruto_g: string };

const REQUIEREN_REPESAR = ["REVISAR", "IMPOSIBLE"];

export function Resultado({
  envase,
  resultado,
  alRepesar,
  alSiguienteBotella,
}: {
  envase: EnvaseDetalle;
  resultado: ResultadoPesada;
  alRepesar: () => void;
  alSiguienteBotella: () => void;
}) {
  const semaforo =
    resultado.estado === "enviada" ? resultado.pesada.semaforo : null;
  const insiste = semaforo
    ? REQUIEREN_REPESAR.some((prefijo) => semaforo.startsWith(prefijo))
    : false;

  return (
    <section className="pantalla pantalla--centrada">
      <h2 className="paso-titulo">Listo</h2>

      <p className="envase__titulo">
        {nombrarEnvase(envase)}
      </p>

      {resultado.estado === "enviada" ? (
        <>
          <Semaforo valor={resultado.pesada.semaforo} />
          <dl className="calculo">
            <div>
              <dt>Bruto</dt>
              <dd>{Number(resultado.pesada.peso_bruto_g).toFixed(2)} g</dd>
            </div>
            <div>
              <dt>Neto</dt>
              <dd>
                {resultado.pesada.peso_neto_g
                  ? `${Number(resultado.pesada.peso_neto_g).toFixed(2)} g`
                  : "sin tara"}
              </dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{resultado.pesada.fecha_operacion}</dd>
            </div>
          </dl>
        </>
      ) : (
        <Aviso>
          Guardada en el telefono ({Number(resultado.peso_bruto_g).toFixed(2)} g)
          y pendiente de enviar. Se sincroniza sola al volver la senal, y ahi
          se confirma la coherencia de la pesada.
        </Aviso>
      )}

      {insiste ? (
        <Aviso tono="mal">
          Vuelva a poner la botella en la balanza antes de continuar. Si el
          numero se repite, es real: anotelo en la observacion y siga.
        </Aviso>
      ) : null}

      <div className="acciones acciones--columna">
        <Boton
          type="button"
          variante={insiste ? "principal" : "secundario"}
          onClick={alRepesar}
        >
          Repesar esta botella
        </Boton>
        <Boton
          type="button"
          variante={insiste ? "secundario" : "principal"}
          onClick={alSiguienteBotella}
        >
          Siguiente botella
        </Boton>
      </div>
    </section>
  );
}
