/**
 * Lectura de QR con la camara del telefono.
 *
 * Usa `BarcodeDetector` cuando el navegador lo trae (Chrome en Android) y cae
 * a jsQR empaquetado con la app cuando no. El respaldo va en el bundle y no en
 * un CDN a proposito: si dependiera de una red que en el sotano no existe, no
 * serviria justo donde hace falta.
 *
 * `getUserMedia` exige contexto seguro. En desarrollo se entra por localhost;
 * en el laboratorio, por la URL de la nube con HTTPS.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Detector = (video: HTMLVideoElement) => Promise<string | null>;

interface BarcodeDetectorLike {
  detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (opciones: { formats: string[] }): BarcodeDetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

async function crearDetector(): Promise<Detector> {
  if (window.BarcodeDetector) {
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats?.();
      if (!formatos || formatos.includes("qr_code")) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        return async (video) => {
          const codigos = await detector.detect(video);
          return codigos[0]?.rawValue ?? null;
        };
      }
    } catch {
      // Sigue con el respaldo.
    }
  }

  const { default: jsQR } = await import("jsqr");
  const lienzo = document.createElement("canvas");
  const contexto = lienzo.getContext("2d", { willReadFrequently: true });

  return async (video) => {
    if (!contexto || !video.videoWidth) return null;
    // Se escala a 480 px de ancho: suficiente para leer un QR de 25 mm y
    // mucho mas liviano que procesar el cuadro completo en un telefono.
    const escala = Math.min(1, 480 / video.videoWidth);
    lienzo.width = Math.round(video.videoWidth * escala);
    lienzo.height = Math.round(video.videoHeight * escala);
    contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
    return jsQR(imagen.data, imagen.width, imagen.height)?.data ?? null;
  };
}

export function useEscaner(alLeer: (codigo: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alLeerRef = useRef(alLeer);
  alLeerRef.current = alLeer;

  const detener = useCallback(() => {
    const video = videoRef.current;
    const flujo = video?.srcObject as MediaStream | null;
    flujo?.getTracks().forEach((pista) => pista.stop());
    if (video) video.srcObject = null;
    setActivo(false);
  }, []);

  const iniciar = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Este navegador no da acceso a la camara. Escriba el codigo a mano.",
      );
      return;
    }
    if (!window.isSecureContext) {
      setError(
        "La camara solo funciona sobre HTTPS. Entre por la direccion segura.",
      );
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
        setActivo(true);
      } else {
        flujo.getTracks().forEach((pista) => pista.stop());
      }
    } catch {
      setError(
        "No se pudo abrir la camara. Revise el permiso o escriba el codigo.",
      );
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    let cancelado = false;
    let cuadro = 0;
    let ultimo = "";

    (async () => {
      const detectar = await crearDetector();
      const revisar = async () => {
        if (cancelado) return;
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          try {
            const codigo = await detectar(video);
            // Un QR se lee muchas veces por segundo; solo interesa el cambio.
            if (codigo && codigo !== ultimo) {
              ultimo = codigo;
              if (navigator.vibrate) navigator.vibrate(40);
              alLeerRef.current(codigo);
            }
          } catch {
            // Un cuadro ilegible no es un error: se intenta con el siguiente.
          }
        }
        cuadro = requestAnimationFrame(() => void revisar());
      };
      void revisar();
    })();

    return () => {
      cancelado = true;
      cancelAnimationFrame(cuadro);
    };
  }, [activo]);

  useEffect(() => detener, [detener]);

  return { videoRef, activo, error, iniciar, detener };
}
