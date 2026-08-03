/**
 * Camara para evidencia fotografica.
 *
 * Comparte las restricciones del lector de QR —contexto seguro y permiso— pero
 * no el proposito: aqui no se busca un codigo en cada cuadro, sino una sola
 * imagen que despues sostiene una afirmacion del censo.
 *
 * La foto se reduce antes de subirla. Un celular moderno entrega 4000 px de
 * ancho y 6 MB; para probar que una etiqueta dice -98 de un lado y -99 del
 * otro sobra bastante menos, y en el sotano cada byte se paga en espera.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const ANCHO_MAXIMO = 1600;
const CALIDAD = 0.82;

export function useCamara() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activa, setActiva] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detener = useCallback(() => {
    const video = videoRef.current;
    const flujo = video?.srcObject as MediaStream | null;
    flujo?.getTracks().forEach((pista) => pista.stop());
    if (video) video.srcObject = null;
    setActiva(false);
  }, []);

  const iniciar = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no da acceso a la camara.");
      return;
    }
    if (!window.isSecureContext) {
      setError("La camara solo funciona sobre HTTPS. Entre por la direccion segura.");
      return;
    }
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = flujo;
        await videoRef.current.play();
        setActiva(true);
      } else {
        flujo.getTracks().forEach((pista) => pista.stop());
      }
    } catch {
      setError("No se pudo abrir la camara. Revise el permiso.");
    }
  }, []);

  const capturar = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const escala = Math.min(1, ANCHO_MAXIMO / video.videoWidth);
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(video.videoWidth * escala);
    lienzo.height = Math.round(video.videoHeight * escala);

    const contexto = lienzo.getContext("2d");
    if (!contexto) return null;
    contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);

    return new Promise((resolver) =>
      lienzo.toBlob((blob) => resolver(blob), "image/jpeg", CALIDAD),
    );
  }, []);

  useEffect(() => detener, [detener]);

  return { videoRef, activa, error, iniciar, detener, capturar };
}
