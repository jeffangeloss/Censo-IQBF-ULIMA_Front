/**
 * Flujo del censo: escanear, pesar, cerrar.
 *
 * Es una maquina de estados y no un enrutador con URLs. El recorrido es lineal
 * y offline: no hay a donde enlazar ni nada que compartir, y una URL de mas es
 * una forma de entrar a la pantalla 2 sin haber pasado por la 1.
 *
 * Alrededor de ese recorrido hay tres secciones que no son lineales —niveles,
 * conflictos y avance— y se alcanzan desde una barra inferior. Van abajo
 * porque la app se opera con una mano: arriba no llega el pulgar.
 */

import { useState } from "react";

import { ErrorApi, ErrorDeRed, api } from "@/api/cliente";
import type { EnvaseDetalle } from "@/api/tipos";
import { BarraEstado } from "@/app/BarraEstado";
import { Tablero } from "@/features/avance/Tablero";
import { Cierre, type BorradorCierre } from "@/features/cierre/Cierre";
import { Conflictos } from "@/features/conflictos/Conflictos";
import { Escaneo } from "@/features/escaneo/Escaneo";
import { Pesada, type BorradorPesada } from "@/features/pesada/Pesada";
import { Resultado, type ResultadoPesada } from "@/features/resultado/Resultado";
import { ProveedorSesion } from "@/features/sesion/Sesion";
import { Zonas } from "@/features/zonas/Zonas";
import { encolar, nuevoUuid } from "@/shared/offline/cola";
import { useCola } from "@/shared/offline/useCola";
import { Aviso } from "@/shared/ui/componentes";

type Paso =
  | { nombre: "escaneo" }
  | { nombre: "pesada"; envase: EnvaseDetalle }
  | { nombre: "cierre"; envase: EnvaseDetalle; borrador: BorradorPesada }
  | { nombre: "resultado"; envase: EnvaseDetalle; resultado: ResultadoPesada };

type Seccion = "censo" | "zonas" | "conflictos" | "avance";

const SECCIONES: { valor: Seccion; texto: string }[] = [
  { valor: "censo", texto: "Censar" },
  { valor: "zonas", texto: "Niveles" },
  { valor: "conflictos", texto: "Conflictos" },
  { valor: "avance", texto: "Avance" },
];

export function App() {
  return (
    <ProveedorSesion>
      <Aplicacion />
    </ProveedorSesion>
  );
}

function Aplicacion() {
  const [seccion, setSeccion] = useState<Seccion>("censo");
  const cola = useCola();

  return (
    <div className="aplicacion">
      <BarraEstado cola={cola} />

      <main>
        {seccion === "censo" ? <Censo cola={cola} /> : null}
        {seccion === "zonas" ? <Zonas /> : null}
        {seccion === "conflictos" ? <Conflictos /> : null}
        {seccion === "avance" ? <Tablero /> : null}
      </main>

      <nav className="navegacion" aria-label="Secciones">
        {SECCIONES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className={`navegacion__boton ${
              seccion === opcion.valor ? "navegacion__boton--activo" : ""
            }`}
            aria-current={seccion === opcion.valor ? "page" : undefined}
            onClick={() => setSeccion(opcion.valor)}
          >
            {opcion.texto}
            {opcion.valor === "censo" && cola.enEspera.length > 0 ? (
              <span className="navegacion__punto" />
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Censo({ cola }: { cola: ReturnType<typeof useCola> }) {
  const [paso, setPaso] = useState<Paso>({ nombre: "escaneo" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(
    envase: EnvaseDetalle,
    borrador: BorradorPesada,
    cierre: BorradorCierre,
  ) {
    setGuardando(true);
    setError(null);

    const cuerpo = {
      client_uuid: nuevoUuid(),
      id_envase: envase.id_envase,
      tipo: "PRIMERA" as const,
      peso_bruto_g: borrador.peso_bruto_g,
      balanza: borrador.balanza || null,
      posicion: cierre.posicion,
      condicion: cierre.condicion,
      observacion: cierre.observacion || null,
    };

    // Se guarda en el telefono ANTES de intentar enviarlo. Si el envio falla,
    // el dato ya esta a salvo: nunca se pierde una pesada por falta de senal.
    const etiqueta =
      envase.id_fisico ?? envase.codigos[0] ?? `Envase ${envase.id_envase}`;
    await encolar(cuerpo, etiqueta);

    try {
      const pesada = await api.registrarPesada(cuerpo);
      await cola.enviar();
      setPaso({
        nombre: "resultado",
        envase,
        resultado: { estado: "enviada", pesada },
      });
    } catch (problema) {
      if (problema instanceof ErrorDeRed) {
        setPaso({
          nombre: "resultado",
          envase,
          resultado: { estado: "encolada", peso_bruto_g: cuerpo.peso_bruto_g },
        });
      } else if (problema instanceof ErrorApi) {
        // El servidor la rechazo. La cola la marca y la deja visible en vez de
        // reintentarla para siempre.
        await cola.enviar();
        setError(problema.message);
      } else {
        setError("No se pudo guardar la pesada.");
      }
    } finally {
      setGuardando(false);
      await cola.refrescar();
    }
  }

  async function reabrir(envase: EnvaseDetalle) {
    try {
      setPaso({ nombre: "pesada", envase: await api.envase(envase.id_envase) });
    } catch {
      setPaso({ nombre: "pesada", envase });
    }
  }

  return (
    <>
      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      {paso.nombre === "escaneo" ? (
        <Escaneo alElegir={(envase) => setPaso({ nombre: "pesada", envase })} />
      ) : null}

      {paso.nombre === "pesada" ? (
        <Pesada
          envase={paso.envase}
          alVolver={() => setPaso({ nombre: "escaneo" })}
          alSiguiente={(borrador) =>
            setPaso({ nombre: "cierre", envase: paso.envase, borrador })
          }
        />
      ) : null}

      {paso.nombre === "cierre" ? (
        <Cierre
          envase={paso.envase}
          peso={paso.borrador.peso_bruto_g}
          guardando={guardando}
          alVolver={() => setPaso({ nombre: "pesada", envase: paso.envase })}
          alGuardar={(cierre) => void guardar(paso.envase, paso.borrador, cierre)}
        />
      ) : null}

      {paso.nombre === "resultado" ? (
        <Resultado
          envase={paso.envase}
          resultado={paso.resultado}
          alRepesar={() => void reabrir(paso.envase)}
          alSiguienteBotella={() => setPaso({ nombre: "escaneo" })}
        />
      ) : null}
    </>
  );
}
