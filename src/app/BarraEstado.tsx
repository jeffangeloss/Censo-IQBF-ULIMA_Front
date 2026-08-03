/**
 * Barra superior.
 *
 * Muestra siempre cuantas pesadas quedan sin enviar. El operador tiene que
 * poder ver, sin abrir nada, que su trabajo no se ha perdido: es la diferencia
 * entre confiar en la app y volver al cuaderno.
 */

import { useState } from "react";

import { useSesion } from "@/features/sesion/Sesion";
import type { useCola } from "@/shared/offline/useCola";
import { Boton, Etiqueta } from "@/shared/ui/componentes";

export function BarraEstado({ cola }: { cola: ReturnType<typeof useCola> }) {
  const { usuario, salir } = useSesion();
  const [abierto, setAbierto] = useState(false);

  const { enEspera, rechazadas, enLinea, sincronizando } = cola;

  return (
    <header className="barra">
      <div className="barra__fila">
        <button
          className="barra__estado"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
        >
          <span className={`punto punto--${enLinea ? "bien" : "mal"}`} />
          {enLinea ? "En linea" : "Sin conexion"}
          {enEspera.length > 0 ? (
            <Etiqueta tono="aviso">{enEspera.length} por enviar</Etiqueta>
          ) : null}
          {rechazadas.length > 0 ? (
            <Etiqueta tono="mal">{rechazadas.length} rechazadas</Etiqueta>
          ) : null}
        </button>
        <span className="barra__usuario">{usuario.nombre}</span>
      </div>

      {abierto ? (
        <div className="barra__panel">
          {enEspera.length === 0 && rechazadas.length === 0 ? (
            <p>Todo sincronizado.</p>
          ) : (
            <ul className="pendientes">
              {enEspera.map((p) => (
                <li key={p.client_uuid}>
                  <span>{p.etiqueta}</span>
                  <span className="pendientes__peso">
                    {Number(p.cuerpo.peso_bruto_g).toFixed(1)} g
                  </span>
                  <Etiqueta tono="aviso">en cola</Etiqueta>
                </li>
              ))}
              {rechazadas.map((p) => (
                <li key={p.client_uuid}>
                  <span>{p.etiqueta}</span>
                  <span className="pendientes__motivo">{p.rechazo?.detalle}</span>
                  <Etiqueta tono="mal">rechazada</Etiqueta>
                </li>
              ))}
            </ul>
          )}

          <div className="acciones">
            <Boton
              type="button"
              variante="secundario"
              disabled={sincronizando || !enLinea}
              onClick={() => void cola.enviar()}
            >
              {sincronizando ? "Enviando…" : "Sincronizar ahora"}
            </Boton>
            <Boton type="button" variante="peligro" onClick={() => void salir()}>
              Salir
            </Boton>
          </div>
        </div>
      ) : null}
    </header>
  );
}
