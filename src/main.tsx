import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import "@/app/estilos.css";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("No se encontro el elemento #root");

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// El service worker solo se registra en produccion: en desarrollo serviria
// codigo viejo desde el cache y volveria loco a cualquiera.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker la app sigue funcionando: solo pierde el arranque
      // sin senal. No es motivo para romper nada.
    });
  });
}
