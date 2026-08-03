/**
 * Pantalla 1 — Escanear.
 *
 * Reemplaza al Ctrl+F sobre el Excel. Cuando el codigo apunta a mas de un
 * envase, la pantalla NO elige: muestra las coincidencias y obliga a decidir
 * con la botella en la mano. Un codigo del maestro apunta a 11 envases.
 */

import { useEffect, useState } from "react";

import { ErrorDeRed, api } from "@/api/cliente";
import type { BusquedaPorCodigo, EnvaseDetalle, EnvaseResumen } from "@/api/tipos";
import { useEscaner } from "@/shared/qr/useEscaner";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoEnvase,
} from "@/shared/ui/componentes";

export function Escaneo({
  alElegir,
}: {
  alElegir: (envase: EnvaseDetalle) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [busqueda, setBusqueda] = useState<BusquedaPorCodigo | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { videoRef, activo, error: errorCamara, iniciar, detener } = useEscaner(
    (leido) => {
      detener();
      setCodigo(leido);
      void buscar(leido);
    },
  );

  useEffect(() => () => detener(), [detener]);

  async function buscar(valor: string) {
    const limpio = valor.trim();
    if (!limpio) return;
    setBuscando(true);
    setError(null);
    setBusqueda(null);
    try {
      setBusqueda(await api.buscarPorCodigo(limpio));
    } catch (problema) {
      setError(
        problema instanceof ErrorDeRed
          ? "Sin conexion: no se puede buscar. Las pesadas ya guardadas se envian solas al volver la senal."
          : "No se pudo buscar el codigo.",
      );
    } finally {
      setBuscando(false);
    }
  }

  async function abrir(resumen: EnvaseResumen) {
    setBuscando(true);
    try {
      alElegir(await api.envase(resumen.id_envase));
    } catch {
      setError("No se pudo abrir la ficha del envase.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <section className="pantalla">
      <h2 className="paso-titulo">
        <span className="paso-numero">1</span> Escanear
      </h2>

      <div className="visor">
        <video ref={videoRef} playsInline muted className="visor__video" />
        {!activo ? (
          <div className="visor__reposo">
            <p>Apunte al codigo QR de la botella</p>
            <Boton type="button" onClick={() => void iniciar()}>
              Abrir camara
            </Boton>
          </div>
        ) : (
          <div className="visor__marco" aria-hidden="true" />
        )}
      </div>

      {errorCamara ? <Aviso>{errorCamara}</Aviso> : null}

      <form
        className="formulario"
        onSubmit={(evento) => {
          evento.preventDefault();
          detener();
          void buscar(codigo);
        }}
      >
        <Campo
          etiqueta="O escriba el codigo"
          value={codigo}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="IQBF-2026-0001 o IQF0102-107-92"
          onChange={(e) => setCodigo(e.target.value)}
        />
        <Boton type="submit" variante="secundario" disabled={buscando}>
          Buscar
        </Boton>
      </form>

      {buscando ? <Cargando texto="Buscando" /> : null}
      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      {busqueda && !buscando ? (
        <Resultados busqueda={busqueda} alAbrir={abrir} />
      ) : null}
    </section>
  );
}

function Resultados({
  busqueda,
  alAbrir,
}: {
  busqueda: BusquedaPorCodigo;
  alAbrir: (envase: EnvaseResumen) => void;
}) {
  if (busqueda.coincidencias.length === 0) {
    return (
      <Aviso>
        Ningun envase registrado con <strong>{busqueda.codigo}</strong>. Si la
        botella existe, registrela como hallada en el estante.
      </Aviso>
    );
  }

  return (
    <div className="resultados">
      {busqueda.ambiguo ? (
        <Aviso tono="mal">
          Este codigo corresponde a {busqueda.coincidencias.length} envases
          distintos. Elija cual tiene en la mano; si no puede distinguirlos,
          pegue primero las etiquetas.
        </Aviso>
      ) : null}

      <ul className="lista">
        {busqueda.coincidencias.map((envase) => (
          <li key={envase.id_envase}>
            <button className="tarjeta" onClick={() => alAbrir(envase)}>
              <div className="tarjeta__fila">
                <strong>{envase.id_fisico ?? "Sin etiqueta"}</strong>
                <EstadoEnvase estado={envase.estado} />
              </div>
              <p className="tarjeta__detalle">
                {envase.insumo_texto ?? "Insumo sin identificar"}
                {envase.numero_lote ? ` · lote ${envase.numero_lote}` : ""}
              </p>
              <p className="tarjeta__meta">
                {envase.codigos.join(" · ") || "sin codigos legados"}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
