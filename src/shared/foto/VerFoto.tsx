/**
 * Muestra una evidencia ya guardada.
 *
 * La imagen se trae con la sesion y se convierte en URL de objeto: un <img>
 * apuntado al endpoint no manda la cabecera de autorizacion y recibiria un
 * 401. La URL se revoca al desmontar para no dejar el blob colgado en memoria.
 */

import { useEffect, useState } from "react";

import { api } from "@/api/cliente";

export function VerFoto({ id_evidencia }: { id_evidencia: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    let creada: string | null = null;

    api
      .evidenciaComoUrl(id_evidencia)
      .then((valor) => {
        if (!vigente) {
          URL.revokeObjectURL(valor);
          return;
        }
        creada = valor;
        setUrl(valor);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });

    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [id_evidencia]);

  if (fallo) return <p className="nota">No se pudo cargar la foto.</p>;
  if (!url) return <p className="nota">Cargando foto…</p>;

  return <img className="evidencia" src={url} alt="Evidencia fotografica" />;
}
