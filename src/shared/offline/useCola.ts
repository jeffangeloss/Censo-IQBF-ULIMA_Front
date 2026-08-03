import { useCallback, useEffect, useState } from "react";

import { listar, sincronizar, type PesadaPendiente } from "@/shared/offline/cola";

export function useCola() {
  const [pendientes, setPendientes] = useState<PesadaPendiente[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [enLinea, setEnLinea] = useState(navigator.onLine);

  const refrescar = useCallback(async () => {
    setPendientes(await listar());
  }, []);

  const enviar = useCallback(async () => {
    if (sincronizando) return;
    setSincronizando(true);
    try {
      await sincronizar();
    } finally {
      setSincronizando(false);
      await refrescar();
    }
  }, [refrescar, sincronizando]);

  useEffect(() => {
    void refrescar();

    const conectado = () => {
      setEnLinea(true);
      void enviar();
    };
    const desconectado = () => setEnLinea(false);

    window.addEventListener("online", conectado);
    window.addEventListener("offline", desconectado);
    // Red intermitente: el evento `online` no siempre llega, asi que ademas
    // se reintenta cada medio minuto mientras quede algo en la cola.
    const reloj = window.setInterval(() => {
      if (navigator.onLine) void enviar();
    }, 30_000);

    return () => {
      window.removeEventListener("online", conectado);
      window.removeEventListener("offline", desconectado);
      window.clearInterval(reloj);
    };
  }, [enviar, refrescar]);

  const rechazadas = pendientes.filter((p) => p.rechazo);
  const enEspera = pendientes.filter((p) => !p.rechazo);

  return {
    pendientes,
    enEspera,
    rechazadas,
    sincronizando,
    enLinea,
    refrescar,
    enviar,
  };
}
