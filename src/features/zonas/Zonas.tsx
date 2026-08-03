/**
 * Barrido por niveles.
 *
 * Cerrar un nivel es el acto mas consecuente de toda la aplicacion: convierte
 * "no la encontre" en "no existe" para cada botella que se esperaba aqui y no
 * aparecio. Por eso la pantalla dice cuantas van a quedar declaradas ausentes
 * ANTES de cerrar, y no despues: una confirmacion que no adelanta su efecto no
 * es una confirmacion, es un tramite.
 */

import { useCallback, useEffect, useState } from "react";

import { ErrorApi, ErrorDeRed, api } from "@/api/cliente";
import type { CierreResultado, ZonaDetalle, ZonaResumen } from "@/api/tipos";
import { useSesion } from "@/features/sesion/Sesion";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoEnvase,
  Etiqueta,
} from "@/shared/ui/componentes";

export function Zonas() {
  const [zonas, setZonas] = useState<ZonaResumen[] | null>(null);
  const [abierta, setAbierta] = useState<ZonaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setZonas(await api.zonas());
    } catch (problema) {
      setError(
        problema instanceof ErrorDeRed
          ? "Sin conexion. El barrido necesita red para no trabajar sobre datos viejos."
          : "No se pudieron cargar los niveles.",
      );
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function abrir(id_zona: number) {
    setError(null);
    try {
      setAbierta(await api.zona(id_zona));
    } catch {
      setError("No se pudo abrir el nivel.");
    }
  }

  if (abierta) {
    return (
      <Nivel
        zona={abierta}
        alVolver={() => {
          setAbierta(null);
          void cargar();
        }}
        alCambiar={setAbierta}
      />
    );
  }

  if (!zonas) return <Cargando texto="Cargando niveles" />;

  return (
    <section className="pantalla">
      <h2 className="paso-titulo">Niveles</h2>
      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      {zonas.length === 0 ? (
        <p className="nota">
          No hay niveles todavia. Se crean con el mapeo del Excel o a mano aqui
          abajo.
        </p>
      ) : (
        <ul className="lista">
          {zonas.map((zona) => (
            <li key={zona.id_zona}>
              <button
                className="lista__boton"
                onClick={() => void abrir(zona.id_zona)}
              >
                <span className="lista__titulo">
                  {zona.gabinete} · nivel {zona.nivel}
                </span>
                <span className="nota">
                  {zona.censados} censados de {zona.esperados} esperados
                  {zona.no_encontrados > 0
                    ? ` · ${zona.no_encontrados} sin aparecer`
                    : ""}
                </span>
                <Etiqueta tono={zona.estado === "CERRADA" ? "bien" : "neutro"}>
                  {zona.estado.toLowerCase()}
                </Etiqueta>
              </button>
            </li>
          ))}
        </ul>
      )}

      <NuevoNivel alCrear={cargar} />
    </section>
  );
}

function NuevoNivel({ alCrear }: { alCrear: () => Promise<void> }) {
  const [gabinete, setGabinete] = useState("");
  const [nivel, setNivel] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await api.crearZona(gabinete.trim(), nivel.trim());
      setGabinete("");
      setNivel("");
      await alCrear();
    } catch (problema) {
      setError(
        problema instanceof ErrorApi
          ? problema.message
          : "No se pudo crear el nivel.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <h3 className="subtitulo">Abrir un nivel nuevo</h3>
      <Campo
        etiqueta="Gabinete"
        required
        value={gabinete}
        onChange={(e) => setGabinete(e.target.value)}
        ayuda="Como se le llama en el laboratorio, no un codigo."
      />
      <Campo
        etiqueta="Nivel"
        required
        value={nivel}
        onChange={(e) => setNivel(e.target.value)}
      />
      {error ? <Aviso tono="mal">{error}</Aviso> : null}
      <Boton type="submit" variante="secundario" disabled={guardando}>
        {guardando ? "Creando…" : "Abrir nivel"}
      </Boton>
    </form>
  );
}

function Nivel({
  zona,
  alVolver,
  alCambiar,
}: {
  zona: ZonaDetalle;
  alVolver: () => void;
  alCambiar: (zona: ZonaDetalle) => void;
}) {
  const { usuario } = useSesion();
  const [conteo, setConteo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cierre, setCierre] = useState<CierreResultado | null>(null);

  const puedeCerrar = usuario.rol === "SUPERVISOR" || usuario.rol === "ADMIN";
  const puedeReabrir = usuario.rol === "ADMIN";
  const porDeclarar = zona.envases.filter(
    (envase) => envase.estado === "PENDIENTE" || envase.estado === "PENDIENTE_TARA",
  ).length;

  async function cerrar(evento: React.FormEvent) {
    evento.preventDefault();
    setTrabajando(true);
    setError(null);
    try {
      const resultado = await api.cerrarZona(zona.id_zona, Number(conteo));
      setCierre(resultado);
      alCambiar(resultado.zona);
    } catch (problema) {
      setError(
        problema instanceof ErrorApi
          ? problema.message
          : "No se pudo cerrar el nivel.",
      );
    } finally {
      setTrabajando(false);
    }
  }

  async function reabrir(evento: React.FormEvent) {
    evento.preventDefault();
    setTrabajando(true);
    setError(null);
    try {
      alCambiar(await api.reabrirZona(zona.id_zona, motivo.trim()));
      setCierre(null);
      setMotivo("");
    } catch (problema) {
      setError(
        problema instanceof ErrorApi
          ? problema.message
          : "No se pudo reabrir el nivel.",
      );
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <section className="pantalla">
      <h2 className="paso-titulo">
        {zona.gabinete} · nivel {zona.nivel}
      </h2>

      <dl className="cuadricula">
        <div>
          <dt>Esperados</dt>
          <dd>{zona.esperados}</dd>
        </div>
        <div>
          <dt>Censados</dt>
          <dd>{zona.censados}</dd>
        </div>
        <div>
          <dt>Pesados aqui</dt>
          <dd>{zona.pesados_aqui}</dd>
        </div>
        <div>
          <dt>Sin aparecer</dt>
          <dd>{zona.no_encontrados}</dd>
        </div>
      </dl>

      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      {cierre ? (
        <Aviso tono={cierre.diferencia_conteo === 0 ? "bien" : "aviso"}>
          Nivel cerrado.{" "}
          {cierre.declarados_no_encontrados.length > 0
            ? `${cierre.declarados_no_encontrados.length} botellas quedaron declaradas
               no encontradas. `
            : "No quedo ninguna botella sin aparecer. "}
          {cierre.diferencia_conteo !== 0
            ? `Contaste ${Math.abs(cierre.diferencia_conteo)} ${
                cierre.diferencia_conteo > 0 ? "mas" : "menos"
              } que las que el sistema tiene identificadas aqui: la diferencia
               quedo registrada como incidencia.`
            : "El conteo a ojo coincide con el sistema."}
        </Aviso>
      ) : null}

      {zona.estado !== "CERRADA" && puedeCerrar ? (
        <form className="formulario" onSubmit={cerrar}>
          <h3 className="subtitulo">Cerrar el nivel</h3>
          {porDeclarar > 0 ? (
            <Aviso tono="aviso">
              Al cerrar, {porDeclarar}{" "}
              {porDeclarar === 1 ? "botella quedara declarada" : "botellas quedaran declaradas"}{" "}
              como no encontradas. Se puede deshacer, pero queda registrado.
            </Aviso>
          ) : null}
          <Campo
            etiqueta="Botellas contadas en el estante"
            type="number"
            inputMode="numeric"
            min={0}
            required
            value={conteo}
            onChange={(e) => setConteo(e.target.value)}
            ayuda="Contadas a ojo, no por el sistema. Sirve justo para contradecirlo."
          />
          <Boton type="submit" variante="peligro" disabled={trabajando}>
            {trabajando ? "Cerrando…" : "Cerrar nivel"}
          </Boton>
        </form>
      ) : null}

      {zona.estado !== "CERRADA" && !puedeCerrar ? (
        <p className="nota">
          Cerrar un nivel lo firma un supervisor. Su rol es {usuario.rol.toLowerCase()}.
        </p>
      ) : null}

      {zona.estado === "CERRADA" && puedeReabrir ? (
        <form className="formulario" onSubmit={reabrir}>
          <h3 className="subtitulo">Reabrir</h3>
          <Campo
            etiqueta="Motivo"
            required
            minLength={10}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            ayuda="Queda escrito junto a quien reabrio. Minimo 10 caracteres."
          />
          <Boton type="submit" variante="secundario" disabled={trabajando}>
            {trabajando ? "Reabriendo…" : "Reabrir nivel"}
          </Boton>
        </form>
      ) : null}

      <h3 className="subtitulo">Botellas esperadas aqui</h3>
      {zona.envases.length === 0 ? (
        <p className="nota">
          Ninguna. El Excel no dice donde va este nivel: la expectativa se
          construye asignando botellas mientras se barre.
        </p>
      ) : (
        <ul className="lista">
          {zona.envases.map((envase) => (
            <li key={envase.id_envase} className="lista__fila">
              <span>{envase.id_fisico ?? `Envase ${envase.id_envase}`}</span>
              <span className="nota">{envase.insumo_texto}</span>
              <EstadoEnvase estado={envase.estado} />
            </li>
          ))}
        </ul>
      )}

      <div className="acciones">
        <Boton type="button" variante="secundario" onClick={alVolver}>
          Volver a los niveles
        </Boton>
      </div>
    </section>
  );
}
