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
