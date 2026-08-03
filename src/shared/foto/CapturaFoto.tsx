/**
 * Tomar una foto y subirla como evidencia.
 *
 * Devuelve el `id_evidencia` para que quien la use la asocie a lo suyo. La
 * subida es idempotente por sha256: la misma imagen no ocupa la base dos
 * veces, asi que reintentar es barato.
 *
 * Hay una alternativa sin camara a proposito. En el sotano un permiso denegado
 * o un navegador viejo no puede dejar a nadie sin poder documentar lo que
 * tiene delante.
 */

import { useState } from "react";

import { ErrorApi, ErrorDeRed, api } from "@/api/cliente";
import { useCamara } from "@/shared/foto/useCamara";
import { Aviso, Boton } from "@/shared/ui/componentes";

export function CapturaFoto({
  descripcion,
  alSubir,
}: {
  descripcion?: string;
  alSubir: (id_evidencia: number) => void;
}) {
  const { videoRef, activa, error: errorCamara, iniciar, detener, capturar } =
    useCamara();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function subir(imagen: Blob | null) {
    if (!imagen) {
      setError("No se pudo tomar la foto. Intente de nuevo.");
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const evidencia = await api.subirEvidencia(imagen, descripcion);
      setListo(true);
      detener();
      alSubir(evidencia.id_evidencia);
    } catch (problema) {
      if (problema instanceof ErrorDeRed) {
        setError(
          "Sin conexion. La foto no se encola: tomela otra vez cuando vuelva la senal.",
        );
      } else {
        setError(
          problema instanceof ErrorApi ? problema.message : "No se pudo subir la foto.",
        );
      }
    } finally {
      setSubiendo(false);
    }
  }

  if (listo) {
    return (
      <Aviso tono="bien">
        Foto adjuntada.{" "}
        <button
          type="button"
          className="enlace"
          onClick={() => {
            setListo(false);
            void iniciar();
          }}
        >
          Tomar otra
        </button>
      </Aviso>
    );
  }

  return (
    <div className="captura">
      <div className="visor">
        <video
          ref={videoRef}
          className="visor__video"
          playsInline
          muted
          hidden={!activa}
        />
        {!activa ? (
          <p className="visor__reposo">La camara esta apagada</p>
        ) : (
          <span className="visor__marco" />
        )}
      </div>

      {errorCamara ? <Aviso tono="aviso">{errorCamara}</Aviso> : null}
      {error ? <Aviso tono="mal">{error}</Aviso> : null}

      <div className="acciones">
        {activa ? (
          <>
            <Boton
              type="button"
              disabled={subiendo}
              onClick={() => void capturar().then(subir)}
            >
              {subiendo ? "Subiendo…" : "Tomar foto"}
            </Boton>
            <Boton type="button" variante="secundario" onClick={detener}>
              Apagar
            </Boton>
          </>
        ) : (
          <Boton type="button" variante="secundario" onClick={() => void iniciar()}>
            Encender la camara
          </Boton>
        )}
      </div>

      <label className="campo">
        <span className="campo__etiqueta">O elegir una imagen del telefono</span>
        <input
          className="campo__control"
          type="file"
          accept="image/*"
          disabled={subiendo}
          onChange={(evento) => {
            const archivo = evento.target.files?.[0];
            if (archivo) void subir(archivo);
          }}
        />
      </label>
    </div>
  );
}
