/**
 * Pantalla 2 — Pesar.
 *
 * El peso se teclea en GRAMOS, tal cual la balanza. La division entre mil la
 * hace la base: dividir a mano fue el origen del error del /10000 en el Excel.
 *
 * La pantalla muestra la aritmetica (bruto menos tara contra lo declarado)
 * pero NO emite un veredicto: el semaforo lo decide el servidor y aparece
 * despues de guardar. Mostrar los numeros permite detectar un digito perdido
 * en el momento; llamarlo "OK" sin que el servidor lo haya dicho seria
 * inventar una segunda fuente de verdad.
 */

import { useMemo, useState } from "react";

import type { EnvaseDetalle } from "@/api/tipos";
import { nombrarEnvase, sinEtiqueta } from "@/shared/envase";
import { Aviso, Boton, Campo } from "@/shared/ui/componentes";

export interface BorradorPesada {
  peso_bruto_g: string;
  balanza: string;
}

function aNumero(valor: string | null): number | null {
  if (!valor) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function Pesada({
  envase,
  alSiguiente,
  alVolver,
}: {
  envase: EnvaseDetalle;
  alSiguiente: (borrador: BorradorPesada) => void;
  alVolver: () => void;
}) {
  const [peso, setPeso] = useState("");
  const [balanza, setBalanza] = useState(
    () => localStorage.getItem("censo.balanza") ?? "",
  );

  const tara = aNumero(envase.tara_g);
  const declarado = aNumero(envase.peso_neto_declarado_g);
  const bruto = aNumero(peso.replace(",", "."));

  const calculo = useMemo(() => {
    if (bruto === null || tara === null) return null;
    const neto = bruto - tara;
    const desvio =
      declarado && declarado > 0 ? (neto - declarado) / declarado : null;
    return { neto, desvio };
  }, [bruto, declarado, tara]);

  const bloqueado = envase.estado === "EN_CONFLICTO";

  return (
    <section className="pantalla">
      <h2 className="paso-titulo">
        <span className="paso-numero">2</span> Pesar
      </h2>

      <FichaEnvase envase={envase} />

      {bloqueado ? (
        <Aviso tono="mal">
          Este envase tiene un conflicto de identidad abierto. No se puede pesar
          hasta resolverlo: fotografie las caras con los dos codigos y avise al
          supervisor.
        </Aviso>
      ) : null}

      {tara === null ? (
        <Aviso>
          Sin tara no hay saldo. Puede registrar la pesada igual, pero el envase
          quedara pendiente hasta pesar el envase vacio.
        </Aviso>
      ) : null}

      <form
        className="formulario"
        onSubmit={(evento) => {
          evento.preventDefault();
          localStorage.setItem("censo.balanza", balanza.trim());
          alSiguiente({
            peso_bruto_g: (bruto ?? 0).toFixed(4),
            balanza: balanza.trim(),
          });
        }}
      >
        <Campo
          etiqueta="Peso bruto en gramos"
          ayuda="Tal cual la balanza. No divida a mano."
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max="60000"
          required
          autoFocus
          disabled={bloqueado}
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
        />

        {calculo ? (
          <dl className="calculo">
            <div>
              <dt>Neto calculado</dt>
              <dd>{calculo.neto.toFixed(2)} g</dd>
            </div>
            {declarado ? (
              <>
                <div>
                  <dt>Declarado</dt>
                  <dd>{declarado.toFixed(2)} g</dd>
                </div>
                <div>
                  <dt>Diferencia</dt>
                  <dd
                    className={
                      calculo.desvio !== null && Math.abs(calculo.desvio) > 0.15
                        ? "calculo__alerta"
                        : undefined
                    }
                  >
                    {calculo.desvio !== null
                      ? `${(calculo.desvio * 100).toFixed(1)} %`
                      : "—"}
                  </dd>
                </div>
              </>
            ) : null}
            <p className="calculo__nota">
              Aritmetica de referencia. El veredicto lo da el servidor al
              guardar.
            </p>
          </dl>
        ) : null}

        <Campo
          etiqueta="Balanza"
          ayuda="Se recuerda para las siguientes botellas."
          value={balanza}
          disabled={bloqueado}
          onChange={(e) => setBalanza(e.target.value)}
        />

        <div className="acciones">
          <Boton type="button" variante="secundario" onClick={alVolver}>
            Volver
          </Boton>
          <Boton type="submit" disabled={bloqueado || bruto === null}>
            Siguiente
          </Boton>
        </div>
      </form>
    </section>
  );
}

export function FichaEnvase({ envase }: { envase: EnvaseDetalle }) {
  return (
    <div className="envase">
      <p className="envase__titulo">{nombrarEnvase(envase)}</p>
      {sinEtiqueta(envase) ? (
        <p className="nota">
          Sin etiqueta física pegada. Se identifica por su código legado.
        </p>
      ) : null}
      <p className="envase__insumo">
        {envase.insumo_texto ?? "Insumo sin identificar"}
      </p>
      <dl className="envase__datos">
        <div>
          <dt>Lote</dt>
          <dd>{envase.numero_lote ?? "—"}</dd>
        </div>
        <div>
          <dt>Tara</dt>
          <dd>{envase.tara_g ? `${Number(envase.tara_g).toFixed(1)} g` : "—"}</dd>
        </div>
        <div>
          <dt>Declarado</dt>
          <dd>
            {envase.peso_neto_declarado_g
              ? `${Number(envase.peso_neto_declarado_g).toFixed(0)} g`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Caducidad</dt>
          <dd>
            {envase.fecha_caducidad_efectiva ?? "—"}
            {envase.fuente_caducidad === "SOLO_EXCEL" ? (
              <span className="envase__sinverificar"> sin verificar</span>
            ) : null}
          </dd>
        </div>
      </dl>
      {envase.codigos.length ? (
        <p className="envase__codigos">{envase.codigos.join(" · ")}</p>
      ) : null}
    </div>
  );
}
